import type { GeneratedRecipe, Ingredient } from "../recipe";
import type { PantrySubstitutionLine } from "./types";

const PANTRY_SWAP_NOTE = "Pantry swaps applied.";

export function applyPantrySubstitutions(
  recipe: GeneratedRecipe,
  substitutions: PantrySubstitutionLine[],
): GeneratedRecipe {
  if (substitutions.length === 0) {
    return recipe;
  }

  const byIndex = new Map(substitutions.map((line) => [line.originalIndex, line]));
  const ingredients: Ingredient[] = recipe.ingredients.map((ingredient, index) => {
    const line = byIndex.get(index);
    if (!line) {
      return ingredient;
    }
    return {
      ...line.replacement,
      notes: line.replacement.notes ?? ingredient.notes ?? null,
    };
  });

  const uncertainties = [...(recipe.uncertainties ?? [])];
  if (!uncertainties.includes(PANTRY_SWAP_NOTE)) {
    uncertainties.push(PANTRY_SWAP_NOTE);
  }

  return {
    ...recipe,
    ingredients,
    uncertainties,
  };
}
