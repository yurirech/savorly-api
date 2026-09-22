import type { GeneratedRecipe, Ingredient, PantryResponse, PantrySubstitutionLine, PantrySubstitutionResponse, RecipePantryMatchResult, SavedRecipe } from "@savorly/shared";
import { applyPantrySubstitutions } from "@savorly/shared";

function firstPantryStapleLabel(pantry: PantryResponse): string {
  const starter = pantry.starters.find((item) => item.inPantry);
  if (starter) {
    return starter.defaultName;
  }
  const custom = pantry.items[0];
  return custom?.displayName ?? "Pantry staple";
}

export function mockPantrySubstitutions(
  recipe: SavedRecipe,
  match: RecipePantryMatchResult,
  pantry: PantryResponse,
): PantrySubstitutionResponse {
  const missingRow = match.ingredients.find((row) => !row.matched);
  if (!missingRow) {
    throw new Error("mockPantrySubstitutions requires missing ingredients");
  }

  const original = recipe.ingredients[missingRow.index];
  const pantryLabel = firstPantryStapleLabel(pantry);
  const replacement: Ingredient = {
    name: pantryLabel,
    quantity: original?.quantity ?? null,
    unit: original?.unit ?? null,
    notes: original?.notes ?? null,
  };

  const substitutions: PantrySubstitutionLine[] = [
    {
      originalIndex: missingRow.index,
      originalName: missingRow.name,
      pantryStapleLabel: pantryLabel,
      replacement,
      rationale: `Use ${pantryLabel} from your pantry instead of ${missingRow.name}.`,
    },
  ];

  const adaptSummary = `Mock pantry swap: ${missingRow.name} → ${pantryLabel}.`;
  const adaptedRecipe = applyPantrySubstitutions(savedRecipeToGenerated(recipe), substitutions);

  return {
    substitutions,
    adaptSummary,
    adaptedRecipe,
  };
}

export function savedRecipeToGenerated(recipe: SavedRecipe): GeneratedRecipe {
  const { id: _id, userId: _userId, createdAt: _createdAt, updatedAt: _updatedAt, ...generated } = recipe;
  return generated;
}
