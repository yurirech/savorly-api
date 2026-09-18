import { chefServingWeightG, type ChefGenerateRequest, type GeneratedRecipe, type RecipeNutrition } from "@savorly/shared";

export function normalizeChefRecipe(recipe: GeneratedRecipe, request: ChefGenerateRequest): GeneratedRecipe {
  return {
    ...recipe,
    servings: recipe.servings ?? request.servings,
    nutrition: normalizeChefNutrition(recipe.nutrition, request),
  };
}

function normalizeChefNutrition(
  nutrition: RecipeNutrition | null | undefined,
  request: ChefGenerateRequest,
): RecipeNutrition | null {
  if (!nutrition) return null;
  return {
    servingG: nutrition.servingG > 0 ? nutrition.servingG : chefServingWeightG(request.mealType),
    perServing: nutrition.perServing,
  };
}
