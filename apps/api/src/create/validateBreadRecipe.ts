import {
  BREAD_SLICE_G,
  breadDefaultServings,
  type BreadGenerateRequest,
  type GeneratedRecipe,
  type RecipeNutrition,
} from "@savorly/shared";

export function normalizeBreadRecipe(recipe: GeneratedRecipe, request: BreadGenerateRequest): GeneratedRecipe {
  return {
    ...recipe,
    servings: recipe.servings ?? breadDefaultServings(request.size),
    nutrition: normalizeBreadNutrition(recipe.nutrition),
  };
}

function normalizeBreadNutrition(nutrition: RecipeNutrition | null | undefined): RecipeNutrition | null {
  if (!nutrition) return null;
  return {
    servingG: nutrition.servingG > 0 ? nutrition.servingG : BREAD_SLICE_G,
    perServing: nutrition.perServing,
  };
}
