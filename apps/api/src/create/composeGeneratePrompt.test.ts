import { describe, expect, it } from "vitest";
import type { CreamiGenerateRequest, GeneratedRecipe } from "@savorly/shared";
import { composeSystemInstruction, composeUserMessage, promptSlicesFor } from "./composeGeneratePrompt";

const creami: CreamiGenerateRequest = {
  agent: "creami",
  size: "small",
  macros: "lean",
  texture: "gelato",
  sweetenerKind: "lightweight",
};

const previousRecipe: GeneratedRecipe = {
  title: "Vanilla Creami",
  category: "dessert",
  ingredients: [{ name: "fat-free quark", quantity: 250, unit: "g", notes: null }],
  steps: [{ order: 1, text: "Mix.", durationMinutes: null, temperatureC: null }],
  tags: ["creami"],
  uncertainties: [],
  nutrition: {
    servingG: 150,
    perServing: { kcal: 150, proteinG: 22, carbsG: 12, fatG: 2 },
    perPint: { kcal: 450, proteinG: 66, carbsG: 36, fatG: 6 },
  },
  source: { type: "manual", sourceName: "Creami" },
};

describe("composeGeneratePrompt", () => {
  it("includes science, staples, and selected Creami slices, not unused ones", () => {
    expect(promptSlicesFor(creami)).toEqual([
      "creami/core.md",
      "creami/science.md",
      "creami/staples.md",
      "creami/size-small.md",
      "creami/macros-lean.md",
      "creami/texture-gelato.md",
    ]);

    const system = composeSystemInstruction(creami);
    expect(system).toContain("ice-cream-shop title");
    expect(system).toContain("invent exactly one dessert-y flavor");
    expect(system).toContain("steps to []");
    expect(system).toContain("[creami.science]");
    expect(system).toContain("[creami.staples]");
    expect(system).toContain("[creami.size.small]");
    expect(system).toContain("[creami.macros.lean]");
    expect(system).toContain("[creami.texture.gelato]");
    expect(system).not.toContain("[creami.adapt]");
    expect(system).not.toContain("[creami.size.big]");
    expect(system).not.toContain("[creami.macros.balanced]");
    expect(system).not.toContain("[creami.base.mixed]");
    expect(system).not.toContain("[creami.base.lean]");
    expect(system).not.toContain("[creami.texture.standard]");
    expect(system).not.toContain("canonicalKey");
    expect(system).not.toContain("Copy the column");
    expect(system).not.toContain("271");
    expect(system.length).toBeLessThan(4000);
  });

  it("adds the adapt slice only when adapting", () => {
    expect(promptSlicesFor({ ...creami, adaptNote: "I don't have cocoa", previousRecipe })).toContain("creami/adapt.md");
    expect(composeSystemInstruction({ ...creami, adaptNote: "I don't have cocoa", previousRecipe })).toContain(
      "[creami.adapt]",
    );
  });

  it("asks Gemini to invent one dessert combo when flavor is blank", () => {
    const user = composeUserMessage({
      ...creami,
      previousRecipe,
      adaptNote: "I don't have cocoa",
    });
    expect(user).toContain("flavor: invent one dessert combo");
    expect(user).toContain("pintFillG: 450");
    expect(user).toContain("sugarG: 15");
    expect(user).toContain("servings: 3");
    expect(user).toContain("adapt: I don't have cocoa");
    expect(user).toContain("Vanilla Creami");
    expect(user).toContain("fat-free quark");
    expect(user).not.toContain('"sourceName":"Creami"');
    expect(user).not.toContain("perServing");
    expect(user).not.toContain("base:");
  });

  it("sends 600 g fill for a big pint", () => {
    const user = composeUserMessage({ ...creami, size: "big" });
    expect(user).toContain("pintFillG: 600");
    expect(user).toContain("sugarG: 20");
    expect(user).toContain("servings: 4");
    expect(composeSystemInstruction({ ...creami, size: "big" })).toContain("pintFillG = 600");
    expect(composeSystemInstruction({ ...creami, size: "big" })).not.toContain("1.33");
  });

  it("keeps an explicit flavor", () => {
    expect(composeUserMessage({ ...creami, flavor: "pistachio baklava" })).toContain("flavor: pistachio baklava");
  });

  it("resolves sweetener defaults and named sweeteners", () => {
    expect(composeUserMessage(creami)).toContain("sweetenerKind: lightweight");
    expect(composeUserMessage(creami)).toContain("sweetener: stevia");
    expect(composeUserMessage({ ...creami, sweetenerKind: "bulky" })).toContain("sweetener: xylitol");
    expect(composeUserMessage({ ...creami, sweetenerKind: "bulky", sweetenerName: "erythritol" })).toContain(
      "sweetener: erythritol",
    );
  });

  it("loads only the bread core slice", () => {
    expect(promptSlicesFor({ agent: "bread", notes: "rye" })).toEqual(["bread/core.md"]);
    expect(composeSystemInstruction({ agent: "bread", notes: "rye" })).toContain("[bread.core]");
  });
});
