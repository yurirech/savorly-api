import type { FoodCategory, MealSuggestionResponse } from "@savorly/shared";
import {
  activePantryStapleCount,
  buildPantryMatchIndex,
  rankRecipesForPantry,
} from "@savorly/shared";
import type { Database } from "../db/client";
import { AppError } from "../errors";
import { searchRecipes } from "../recipes/recipeStore";
import { getPantry } from "./pantryStore";

export type SuggestMealsQuery = {
  category?: FoodCategory;
  excludeRecipeIds?: string[];
};

export function parseMealSuggestionExcludeIds(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export async function suggestMeal(
  db: Database,
  userId: string,
  query: SuggestMealsQuery,
): Promise<MealSuggestionResponse> {
  const pantry = await getPantry(db, userId);
  const activeStapleCount = activePantryStapleCount(pantry);
  if (activeStapleCount === 0) {
    throw new AppError("validation_error", "Add staples to your pantry first.", 400);
  }

  const index = buildPantryMatchIndex(pantry);
  const recipes = await searchRecipes(db, userId, { category: query.category });
  const ranked = rankRecipesForPantry(recipes, index, {
    category: query.category,
    excludeRecipeIds: query.excludeRecipeIds,
  });

  const top = ranked[0];
  return {
    suggestion: top
      ? {
          recipe: top.recipe,
          matchedCount: top.matchedCount,
          totalCount: top.totalCount,
          matchedIngredients: top.matchedIngredients,
          missingIngredients: top.missingIngredients,
        }
      : null,
    rankedTotal: ranked.length,
    activeStapleCount,
  };
}
