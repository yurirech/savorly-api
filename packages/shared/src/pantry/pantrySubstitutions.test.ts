import { describe, expect, it } from "vitest";
import type { GeneratedRecipe } from "../recipe";
import { applyPantrySubstitutions } from "./pantrySubstitutions";
import type { PantrySubstitutionLine } from "./types";

describe("applyPantrySubstitutions", () => {
  it("replaces ingredients by index and appends uncertainty note", () => {
    const recipe: GeneratedRecipe = {
      title: "Test",
      category: "other",
      ingredients: [
        { name: "butter", quantity: 50, unit: "g" },
        { name: "milk", quantity: 200, unit: "ml" },
      ],
      steps: [],
      tags: [],
      uncertainties: [],
      source: { type: "manual" },
    };

    const substitutions: PantrySubstitutionLine[] = [
      {
        originalIndex: 0,
        originalName: "butter",
        pantryStapleLabel: "Olive oil",
        replacement: { name: "olive oil", quantity: 40, unit: "ml" },
        rationale: "Fat swap",
      },
    ];

    const adapted = applyPantrySubstitutions(recipe, substitutions);
    expect(adapted.ingredients[0]?.name).toBe("olive oil");
    expect(adapted.ingredients[0]?.quantity).toBe(40);
    expect(adapted.ingredients[1]?.name).toBe("milk");
    expect(adapted.uncertainties).toContain("Pantry swaps applied.");
  });
});
