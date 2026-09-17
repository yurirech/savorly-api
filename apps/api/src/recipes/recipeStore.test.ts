import { describe, expect, it } from "vitest";
import { mockGeneratedRecipe, mockImportedSource } from "../importers/mockImports";
import { recipeFromRow, searchDocument } from "./recipeStore";

describe("searchDocument", () => {
  it("indexes title, ingredients, category, tags and source", () => {
    const recipe = mockGeneratedRecipe(mockImportedSource("instagram"));
    const doc = searchDocument(recipe);
    expect(doc.title.toLowerCase()).toContain("cookie");
    expect(doc.category).toBe("cookie");
    expect(doc.ingredientNames).toContain("flour");
    expect(doc.tags.length).toBeGreaterThan(0);
    expect(doc.sourceAuthor).toBe("mock.baker");
    expect(doc.sourceName).toBe("Instagram");
  });
});

describe("recipeFromRow", () => {
  it("maps nutrition jsonb onto the recipe", () => {
    const nutrition = {
      servingG: 150,
      perServing: { kcal: 160, proteinG: 21, carbsG: 14, fatG: 2 },
      perPint: { kcal: 480, proteinG: 63, carbsG: 42, fatG: 6 },
    };
    const recipe = recipeFromRow({
      id: "00000000-0000-0000-0000-000000000001",
      userId: "00000000-0000-0000-0000-000000000002",
      title: "Pint",
      category: "dessert",
      servings: 3,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      ingredients: [{ name: "quark", quantity: 100, unit: "g" }],
      steps: [{ order: 1, text: "Freeze" }],
      tags: [],
      notes: null,
      uncertainties: [],
      nutrition,
      source: { type: "manual", sourceName: "Creami" },
      ingredientNames: ["quark"],
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(recipe.nutrition).toEqual(nutrition);
  });
});
