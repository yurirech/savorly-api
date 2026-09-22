import { describe, expect, it } from "vitest";
import type { SavedRecipe } from "@savorly/shared";
import { STARTER_PANTRY_STAPLES } from "@savorly/shared";
import { evaluateRecipePantryMatch, buildPantryMatchIndex } from "@savorly/shared";
import { mockPantrySubstitutions } from "./mockPantrySubstitutions";
import { parsePantrySubstitutionsFromGemini } from "./suggestPantrySubstitutions";

function minimalRecipe(overrides: Partial<SavedRecipe> & Pick<SavedRecipe, "id" | "ingredients">): SavedRecipe {
  return {
    title: "Test",
    category: "other",
    servings: 2,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    steps: [],
    tags: [],
    notes: null,
    uncertainties: [],
    source: { type: "manual" },
    userId: "user-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("parsePantrySubstitutionsFromGemini", () => {
  it("parses valid substitution payload", () => {
    const recipe = minimalRecipe({
      id: "r1",
      ingredients: [
        { name: "tahini", quantity: 2, unit: "tbsp" },
        { name: "chickpeas", quantity: 1, unit: "cup" },
      ],
    });
    const parsed = parsePantrySubstitutionsFromGemini(
      {
        adaptSummary: "Swapped tahini",
        substitutions: [
          {
            originalIngredientIndex: 0,
            pantryStapleLabel: "Olive oil",
            replacement: { name: "olive oil", quantity: 1, unit: "tbsp" },
            rationale: "Fat substitute",
          },
        ],
      },
      recipe,
      new Set([0]),
    );
    expect(parsed.substitutions[0]?.originalIndex).toBe(0);
    expect(parsed.substitutions[0]?.replacement.name).toBe("olive oil");
  });

  it("rejects indices that are not missing", () => {
    const recipe = minimalRecipe({
      id: "r2",
      ingredients: [{ name: "salt", quantity: 1, unit: "pinch" }],
    });
    expect(() =>
      parsePantrySubstitutionsFromGemini(
        {
          adaptSummary: "Bad",
          substitutions: [
            {
              originalIngredientIndex: 0,
              pantryStapleLabel: "Salt",
              replacement: { name: "salt" },
              rationale: "noop",
            },
          ],
        },
        recipe,
        new Set(),
      ),
    ).toThrow();
  });
});

describe("mockPantrySubstitutions", () => {
  it("builds a mock swap for the first missing ingredient", () => {
    const pantry = {
      starters: STARTER_PANTRY_STAPLES.map((starter) => ({
        ...starter,
        inPantry: starter.key === "olive_oil",
      })),
      items: [],
    };
    const recipe = minimalRecipe({
      id: "r3",
      ingredients: [
        { name: "chickpeas", quantity: 1, unit: "cup" },
        { name: "tahini", quantity: 2, unit: "tbsp" },
      ],
    });
    const match = evaluateRecipePantryMatch(recipe, buildPantryMatchIndex(pantry));
    const result = mockPantrySubstitutions(recipe, match, pantry);
    expect(result.substitutions.length).toBe(1);
    expect(result.adaptedRecipe.ingredients.some((item) => item.name === "Olive oil")).toBe(true);
  });
});
