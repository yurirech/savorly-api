import { describe, expect, it } from "vitest";
import type { SavedRecipe } from "../recipe";
import type { PantryResponse } from "./types";
import { STARTER_PANTRY_STAPLES } from "./starterStaples";
import {
  activePantryStapleCount,
  buildPantryMatchIndex,
  evaluateRecipePantryMatch,
  rankRecipesForPantry,
  scoreRecipePantryMatch,
} from "./mealSuggestions";

function minimalRecipe(overrides: Partial<SavedRecipe> & Pick<SavedRecipe, "id" | "title" | "ingredients">): SavedRecipe {
  return {
    category: "other",
    servings: 2,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    steps: [],
    tags: [],
    notes: null,
    uncertainties: [],
    nutrition: undefined,
    source: { type: "manual", sourceName: "Test" },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function pantryWithFlourAndChickpeas(): PantryResponse {
  return {
    starters: STARTER_PANTRY_STAPLES.map((starter) => ({
      ...starter,
      inPantry: starter.key === "flour" || starter.key === "chickpeas",
    })),
    items: [],
  };
}

describe("buildPantryMatchIndex", () => {
  it("counts active staples", () => {
    const pantry = pantryWithFlourAndChickpeas();
    expect(activePantryStapleCount(pantry)).toBe(2);
    const index = buildPantryMatchIndex(pantry);
    expect(index.canonicalKeys.has("all_purpose_flour")).toBe(true);
    expect(index.aliasKeys.has("ceci")).toBe(true);
  });
});

describe("scoreRecipePantryMatch", () => {
  it("matches starter aliases and dictionary canonical keys", () => {
    const index = buildPantryMatchIndex(pantryWithFlourAndChickpeas());
    const recipe = minimalRecipe({
      id: "1",
      title: "Hummus",
      ingredients: [
        { name: "chickpeas", quantity: 400, unit: "g" },
        { name: "ceci", quantity: 1, unit: "cup" },
        { name: "all purpose flour", quantity: 30, unit: "g" },
        { name: "tahini", quantity: 2, unit: "tbsp" },
      ],
    });

    const score = scoreRecipePantryMatch(recipe, index);
    expect(score.matchedCount).toBe(3);
    expect(score.totalCount).toBe(4);
    expect(score.ratio).toBe(0.75);
    expect(score.missingIngredients).toEqual(["tahini"]);
  });

  it("matches custom staple aliases", () => {
    const pantry: PantryResponse = {
      starters: STARTER_PANTRY_STAPLES.map((starter) => ({ ...starter, inPantry: false })),
      items: [
        {
          id: "custom-1",
          starterKey: null,
          displayName: "Tahini",
          aliases: ["Tahini", "tahini paste"],
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    const index = buildPantryMatchIndex(pantry);
    const recipe = minimalRecipe({
      id: "2",
      title: "Sauce",
      ingredients: [{ name: "tahini paste", quantity: 1, unit: "tbsp" }],
    });
    expect(scoreRecipePantryMatch(recipe, index).matchedCount).toBe(1);
  });
});

describe("evaluateRecipePantryMatch", () => {
  it("marks complete when all ingredients match and attaches quickAdd for missing", () => {
    const index = buildPantryMatchIndex(pantryWithFlourAndChickpeas());
    const partial = minimalRecipe({
      id: "p",
      title: "Partial",
      ingredients: [
        { name: "chickpeas", quantity: 1, unit: "g" },
        { name: "tahini", quantity: 1, unit: "tbsp" },
      ],
    });
    const result = evaluateRecipePantryMatch(partial, index);
    expect(result.isComplete).toBe(false);
    expect(result.missingIngredients).toEqual(["tahini"]);
    const missingRow = result.ingredients.find((row) => !row.matched);
    expect(missingRow?.quickAdd?.kind).toBe("custom");

    const full = minimalRecipe({
      id: "f",
      title: "Full",
      ingredients: [{ name: "chickpeas", quantity: 1, unit: "g" }],
    });
    expect(evaluateRecipePantryMatch(full, index).isComplete).toBe(true);
  });
});

describe("rankRecipesForPantry", () => {
  it("sorts by ratio then matched count and respects category and exclude", () => {
    const index = buildPantryMatchIndex(pantryWithFlourAndChickpeas());
    const recipes = [
      minimalRecipe({
        id: "a",
        title: "B",
        category: "pasta",
        ingredients: [{ name: "chickpeas", quantity: 1, unit: "g" }],
      }),
      minimalRecipe({
        id: "b",
        title: "A",
        category: "pasta",
        ingredients: [
          { name: "chickpeas", quantity: 1, unit: "g" },
          { name: "flour", quantity: 1, unit: "g" },
        ],
      }),
      minimalRecipe({
        id: "c",
        title: "C",
        category: "soup",
        ingredients: [{ name: "chickpeas", quantity: 1, unit: "g" }],
      }),
    ];

    const ranked = rankRecipesForPantry(recipes, index, { category: "pasta" });
    expect(ranked.map((row) => row.recipe.id)).toEqual(["b", "a"]);

    const withExclude = rankRecipesForPantry(recipes, index, { category: "pasta", excludeRecipeIds: ["b"] });
    expect(withExclude[0]?.recipe.id).toBe("a");
  });
});
