import { describe, expect, it } from "vitest";
import type {
  BakeGenerateRequest,
  BreadGenerateRequest,
  ChefGenerateRequest,
  CreamiGenerateRequest,
  GeneratedRecipe,
} from "@savorly/shared";
import { composeSystemInstruction, composeUserMessage, promptSlicesFor } from "./composeGeneratePrompt";

const creami: CreamiGenerateRequest = {
  agent: "creami",
  size: "small",
  macros: "lean",
  texture: "gelato",
  sweetenerKind: "lightweight",
};

const chef: ChefGenerateRequest = {
  agent: "chef",
  mealType: "main",
  servings: 2,
  style: "regular",
};

const bread: BreadGenerateRequest = {
  agent: "bread",
  size: "large",
  style: "regular",
};

const bake: BakeGenerateRequest = {
  agent: "bake",
  kind: "cake",
  style: "regular",
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
    expect(system).toContain("invent exactly one rich dessert-shop flavor");
    expect(system).toContain("Set steps to []");
    expect(system).toContain("[creami.science]");
    expect(system).toContain("[creami.staples]");
    expect(system).toContain("[creami.size.small]");
    expect(system).toContain("[creami.macros.lean]");
    expect(system).toContain("[creami.texture.gelato]");
    expect(system).toContain("[create.output]");
    expect(system).not.toContain("[create.adaptSummary]");
    expect(system).not.toContain("[creami.adapt]");
    expect(system).not.toContain("[creami.macros.balanced]");
    expect(system).not.toContain("[creami.base.mixed]");
    expect(system).not.toContain("[creami.base.lean]");
    expect(system).not.toContain("[creami.texture.standard]");
    expect(system).not.toContain("canonicalKey");
    expect(system).not.toContain("Copy the column");
    expect(system).not.toContain("271");
    expect(system.length).toBeLessThan(4500);
  });

  it("adds the adapt slice only when adapting", () => {
    expect(promptSlicesFor({ ...creami, adaptNote: "I don't have cocoa", previousRecipe })).toContain("creami/adapt.md");
    expect(promptSlicesFor({ ...creami, adaptGoal: "Keep protein high", previousRecipe })).toContain("creami/adapt.md");
    expect(composeSystemInstruction({ ...creami, adaptNote: "I don't have cocoa", previousRecipe })).toContain(
      "[creami.adapt]",
    );
    expect(composeSystemInstruction({ ...creami, adaptNote: "I don't have cocoa", previousRecipe })).toContain(
      "[create.adaptSummary]",
    );
  });

  it("uses a slim adapt user message with constraints, current recipe, change, and goal", () => {
    const user = composeUserMessage({
      ...creami,
      previousRecipe,
      adaptNote: "I don't have cocoa",
      adaptGoal: "Keep fat under 2g per serving",
    });
    expect(user).toContain("constraints:");
    expect(user).toContain("creami size=small");
    expect(user).toContain("currentRecipe:");
    expect(user).toContain("change: I don't have cocoa");
    expect(user).toContain("goal: Keep fat under 2g per serving");
    expect(user).toContain("Vanilla Creami");
    expect(user).toContain("fat-free quark");
    expect(user).toContain("perServing");
    expect(user).not.toContain("flavor:");
    expect(user).not.toContain("agent: creami");
    expect(user).not.toContain("adapt:");
    expect(user).not.toContain("previous recipe");
  });

  it("initial generation does not include previous recipe", () => {
    const user = composeUserMessage(creami);
    expect(user).toContain("flavor: invent one dessert combo");
    expect(user).not.toContain("currentRecipe:");
    expect(user).not.toContain("change:");
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

  it("loads bread core, science, programs, and the selected size slice", () => {
    expect(promptSlicesFor(bread)).toEqual([
      "bread/core.md",
      "bread/science.md",
      "bread/programs.md",
      "bread/size-large.md",
    ]);
    const system = composeSystemInstruction(bread);
    expect(system).toContain("[bread.core]");
    expect(system).toContain("[bread.science]");
    expect(system).toContain("[bread.programs]");
    expect(system).toContain("[bread.size.large]");
    expect(system).toContain("Choose the program from the dish");
    expect(system).not.toContain("[bread.style.lighter]");
    expect(system).not.toContain("[bread.adapt]");
    expect(system).not.toContain("Command_generate");
    expect(system).toContain("Always include approximate nutrition");
    expect(system.length).toBeLessThan(3500);
  });

  it("adds bread style and adapt slices only when needed", () => {
    expect(promptSlicesFor({ ...bread, style: "lighter" })).toContain("bread/style-lighter.md");
    expect(promptSlicesFor({ ...bread, adaptNote: "too dense", previousRecipe })).toContain("bread/adapt.md");
    expect(composeSystemInstruction({ ...bread, style: "lighter" })).toContain("[bread.style.lighter]");
    expect(composeSystemInstruction({ ...bread, size: "medium" })).toContain("[bread.size.medium]");
    expect(composeSystemInstruction({ ...bread, size: "medium" })).not.toContain("[bread.size.large]");
  });

  it("sends bread size and weight without a program field", () => {
    const user = composeUserMessage(bread);
    expect(user).toContain("agent: bread");
    expect(user).toContain("size: large");
    expect(user).toContain("loafWeightG: 1000");
    expect(user).toContain("style: regular");
    expect(user).toContain("notes: suggest a specific loaf or dough");
    expect(user).not.toContain("program:");
    expect(composeUserMessage({ ...bread, size: "medium", notes: "honey oat" })).toContain("loafWeightG: 750");
    expect(composeUserMessage({ ...bread, notes: "honey oat" })).toContain("notes: honey oat");
  });

  it("loads bake core, science, and the selected kind slice", () => {
    expect(promptSlicesFor(bake)).toEqual(["bake/core.md", "bake/science.md", "bake/kind-cake.md"]);
    const system = composeSystemInstruction(bake);
    expect(system).toContain("[bake.core]");
    expect(system).toContain("[bake.science]");
    expect(system).toContain("[bake.kind.cake]");
    expect(system).toContain("two 8-inch layers");
    expect(system).not.toContain("[bake.style.lighter]");
    expect(system).not.toContain("[bake.adapt]");
    expect(system).not.toContain("Command_generate");
    expect(system).toContain("Always include approximate nutrition");
    expect(system.length).toBeLessThan(3000);
  });

  it("uses muffin architecture instead of layer-cake soak and frosting", () => {
    const muffin = composeSystemInstruction({ ...bake, kind: "muffin" });
    expect(muffin).toContain("[bake.kind.muffin]");
    expect(muffin).toContain("12 standard muffins");
    expect(muffin).toContain("No soak, filling, or frosting architecture");
    expect(muffin).not.toContain("[bake.kind.cake]");
    expect(muffin).not.toContain("two 8-inch layers");
  });

  it("adds bake style and adapt slices only when needed", () => {
    expect(promptSlicesFor({ ...bake, style: "lighter" })).toContain("bake/style-lighter.md");
    expect(promptSlicesFor({ ...bake, adaptNote: "too dense", previousRecipe })).toContain("bake/adapt.md");
    expect(composeSystemInstruction({ ...bake, kind: "cupcake" })).toContain("[bake.kind.cupcake]");
    expect(composeSystemInstruction({ ...bake, kind: "other" })).toContain("[bake.kind.other]");
  });

  it("sends bake kind, style, and notes", () => {
    const user = composeUserMessage(bake);
    expect(user).toContain("agent: bake");
    expect(user).toContain("kind: cake");
    expect(user).toContain("style: regular");
    expect(user).toContain("notes: suggest a specific bake");
    expect(composeUserMessage({ ...bake, notes: "strawberries and lemon" })).toContain(
      "notes: strawberries and lemon",
    );
  });

  it("loads chef core, science, and the selected meal slice", () => {
    expect(promptSlicesFor(chef)).toEqual(["chef/core.md", "chef/science.md", "chef/meal-main.md"]);
    const system = composeSystemInstruction(chef);
    expect(system).toContain("[chef.core]");
    expect(system).toContain("[chef.science]");
    expect(system).toContain("[chef.meal.main]");
    expect(system).not.toContain("[chef.style.lighter]");
    expect(system).not.toContain("[chef.adapt]");
    expect(system).not.toContain("Command_generate");
    expect(system).toContain("Always include approximate nutrition");
    expect(system).not.toContain("If macros are guesswork");
    expect(system.length).toBeLessThan(2500);
  });

  it("adds chef style and adapt slices only when needed", () => {
    expect(promptSlicesFor({ ...chef, style: "lighter" })).toContain("chef/style-lighter.md");
    expect(promptSlicesFor({ ...chef, style: "nutritious" })).toContain("chef/style-nutritious.md");
    expect(promptSlicesFor({ ...chef, adaptNote: "too salty", previousRecipe })).toContain("chef/adapt.md");
    expect(composeSystemInstruction({ ...chef, style: "lighter" })).toContain("[chef.style.lighter]");
    expect(composeSystemInstruction({ ...chef, adaptNote: "too salty", previousRecipe })).toContain("[chef.adapt]");
  });

  it("sends chef servings and serving-weight hint", () => {
    const user = composeUserMessage(chef);
    expect(user).toContain("agent: chef");
    expect(user).toContain("mealType: main");
    expect(user).toContain("servings: 2");
    expect(user).toContain("servingWeightG: 350–550");
    expect(user).toContain("style: regular");
    expect(user).toContain("notes: suggest a specific dish");
    expect(composeUserMessage({ ...chef, notes: "creamy mushroom pasta" })).toContain("notes: creamy mushroom pasta");
  });
});
