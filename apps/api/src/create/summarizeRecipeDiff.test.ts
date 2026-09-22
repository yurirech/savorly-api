import { describe, expect, it } from "vitest";
import type { GeneratedRecipe } from "@savorly/shared";
import { summarizeRecipeDiff } from "./summarizeRecipeDiff";

const baseSource = { type: "manual" as const, sourceName: "Creami" };

function minimalRecipe(overrides: Partial<GeneratedRecipe> = {}): GeneratedRecipe {
  return {
    title: "Test",
    category: "dessert",
    ingredients: [],
    steps: [],
    tags: [],
    uncertainties: [],
    source: baseSource,
    ...overrides,
  };
}

describe("summarizeRecipeDiff", () => {
  it("lists added, removed, and quantity changes", () => {
    const before = minimalRecipe({
      ingredients: [
        { name: "skim milk", quantity: 300, unit: "g", notes: null },
        { name: "cocoa powder", quantity: 10, unit: "g", notes: null },
      ],
      nutrition: {
        servingG: 150,
        perServing: { kcal: 150, proteinG: 20, carbsG: 12, fatG: 3 },
      },
    });
    const after = minimalRecipe({
      ingredients: [
        { name: "skim milk", quantity: 280, unit: "g", notes: null },
        { name: "cocoa powder", quantity: 15, unit: "g", notes: null },
        { name: "peanut butter", quantity: 20, unit: "g", notes: "mix-in" },
      ],
      nutrition: {
        servingG: 150,
        perServing: { kcal: 170, proteinG: 21, carbsG: 14, fatG: 5 },
      },
    });

    const summary = summarizeRecipeDiff(before, after);
    expect(summary).toContain("Added peanut butter");
    expect(summary).toContain("skim milk: 300 g → 280 g");
    expect(summary).toContain("cocoa powder: 10 g → 15 g");
    expect(summary).toContain("fat 3g → 5g");
  });

  it("returns a generic line when nothing differs", () => {
    const recipe = minimalRecipe({
      ingredients: [{ name: "flour", quantity: 200, unit: "g", notes: null }],
    });
    expect(summarizeRecipeDiff(recipe, recipe)).toContain("updated the recipe");
  });
});
