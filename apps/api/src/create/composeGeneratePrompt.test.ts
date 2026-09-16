import { describe, expect, it } from "vitest";
import type { CreamiGenerateRequest, GeneratedRecipe } from "@savorly/shared";
import { composeSystemInstruction, composeUserMessage, promptSlicesFor } from "./composeGeneratePrompt";

const creami: CreamiGenerateRequest = {
  agent: "creami",
  size: "small",
  macros: "lean",
  base: "mixed",
  texture: "gelato",
  sweetener: "stevia",
};

const previousRecipe: GeneratedRecipe = {
  title: "Vanilla Creami",
  category: "dessert",
  ingredients: [{ name: "fat-free quark", quantity: 250, unit: "g", notes: null }],
  steps: [{ order: 1, text: "Mix.", durationMinutes: null, temperatureC: null }],
  tags: ["creami"],
  uncertainties: [],
  source: { type: "manual", sourceName: "Creami" },
};

describe("composeGeneratePrompt", () => {
  it("includes staples and selected Creami slices, not unused ones", () => {
    expect(promptSlicesFor(creami)).toEqual([
      "creami/core.md",
      "creami/staples.md",
      "creami/size-small.md",
      "creami/macros-lean.md",
      "creami/base-mixed.md",
      "creami/texture-gelato.md",
    ]);

    const system = composeSystemInstruction(creami);
    expect(system).toContain("[creami.staples]");
    expect(system).toContain("[creami.size.small]");
    expect(system).toContain("[creami.macros.lean]");
    expect(system).toContain("[creami.base.mixed]");
    expect(system).toContain("[creami.texture.gelato]");
    expect(system).not.toContain("[creami.size.big]");
    expect(system).not.toContain("[creami.macros.balanced]");
    expect(system).not.toContain("[creami.base.lean]");
    expect(system).not.toContain("[creami.texture.standard]");
  });

  it("puts flavor suggest and previous recipe JSON into the adapt user message", () => {
    const user = composeUserMessage({
      ...creami,
      previousRecipe,
      adaptNote: "I don't have cocoa",
    });
    expect(user).toContain("flavor: suggest");
    expect(user).toContain("adapt: I don't have cocoa");
    expect(user).toContain("Vanilla Creami");
    expect(user).toContain('"sourceName":"Creami"');
  });

  it("loads only the bread core slice", () => {
    expect(promptSlicesFor({ agent: "bread", notes: "rye" })).toEqual(["bread/core.md"]);
    expect(composeSystemInstruction({ agent: "bread", notes: "rye" })).toContain("[bread.core]");
  });
});
