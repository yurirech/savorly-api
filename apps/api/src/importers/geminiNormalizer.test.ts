import { describe, expect, it } from "vitest";
import { toGeneratedRecipe } from "../normalize/geminiNormalizer";
import type { ImportedRecipeSource } from "./types";

const imported: ImportedRecipeSource = {
  sourceType: "text",
  sourceName: "Notes",
  originalText: "Cake. Flour and sugar. Bake. Temperature unknown.",
  extractedText: "Cake. Flour and sugar. Bake. Temperature unknown.",
};

describe("gemini fixture mapping", () => {
  it("maps a Gemini payload onto GeneratedRecipe and keeps nulls", () => {
    const recipe = toGeneratedRecipe(
      {
        title: "Simple cake",
        category: "cake",
        servings: null,
        prepTimeMinutes: null,
        cookTimeMinutes: null,
        ingredients: [
          { name: "flour", quantity: null, unit: null },
          { name: "sugar", quantity: null, unit: null },
        ],
        steps: [{ order: 1, text: "Bake.", durationMinutes: null, temperatureC: null }],
        tags: ["cake"],
        notes: null,
        uncertainties: ["Quantities and oven temperature were not specified."],
      },
      imported,
    );

    expect(recipe.category).toBe("cake");
    expect(recipe.ingredients[0]?.quantity).toBeNull();
    expect(recipe.steps[0]?.temperatureC).toBeNull();
    expect(recipe.uncertainties.length).toBeGreaterThan(0);
    expect(recipe.source.type).toBe("text");
    expect(recipe.source.originalText).toContain("Cake");
  });

  it("falls back to other for unknown categories", () => {
    const recipe = toGeneratedRecipe(
      {
        title: "Mystery",
        category: "banquet",
        ingredients: [{ name: "salt" }],
        steps: [{ text: "Mix." }],
        tags: [],
        uncertainties: [],
      },
      imported,
    );
    expect(recipe.category).toBe("other");
  });
});
