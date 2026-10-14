import { describe, expect, it } from "vitest";
import type { GeneratedRecipe } from "./recipe";
import { listRecipeChanges, summarizeRecipeDiff } from "./recipeDiff";

function recipe(overrides: Partial<GeneratedRecipe> = {}): GeneratedRecipe {
  return {
    title: "Lemon cake",
    category: "cake",
    servings: 8,
    ingredients: [{ name: "flour", quantity: 200, unit: "g", notes: null }],
    steps: [{ order: 1, text: "Bake the cake." }],
    tags: [],
    notes: null,
    uncertainties: [],
    nutrition: null,
    source: { type: "manual" },
    ...overrides,
  };
}

describe("listRecipeChanges", () => {
  it("lists added, removed, and quantity changes", () => {
    const lines = listRecipeChanges(
      recipe({
        nutrition: { servingG: 150, perServing: { kcal: 150, proteinG: 20, carbsG: 12, fatG: 3 } },
      }),
      recipe({
        ingredients: [
          { name: "flour", quantity: 180, unit: "g", notes: null },
          { name: "yogurt", quantity: 100, unit: "g", notes: null },
        ],
        nutrition: { servingG: 150, perServing: { kcal: 170, proteinG: 21, carbsG: 14, fatG: 5 } },
      }),
    );
    expect(lines).toContain("Added yogurt (100 g).");
    expect(lines).toContain("flour: 200 g → 180 g.");
    expect(lines.some((line) => line.includes("fat 3g → 5g"))).toBe(true);
  });

  it("notes title, notes, and instruction changes", () => {
    const lines = listRecipeChanges(
      recipe(),
      recipe({
        title: "Citroentaart",
        notes: "Lichter gemaakt.",
        steps: [{ order: 1, text: "Bak de taart." }],
      }),
    );
    expect(lines).toContain("Title: Lemon cake → Citroentaart.");
    expect(lines).toContain("Notes added.");
    expect(lines).toContain("Instructions updated.");
  });

  it("summarizes with a fallback when nothing changed", () => {
    expect(summarizeRecipeDiff(recipe(), recipe())).toBe(
      "Changes: updated the recipe to match your request.",
    );
  });
});
