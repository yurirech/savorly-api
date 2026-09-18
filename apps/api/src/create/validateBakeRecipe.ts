import {
  bakeDefaultServings,
  bakeServingG,
  type BakeGenerateRequest,
  type GeneratedRecipe,
  type RecipeNutrition,
} from "@savorly/shared";

export function normalizeBakeRecipe(recipe: GeneratedRecipe, request: BakeGenerateRequest): GeneratedRecipe {
  return {
    ...recipe,
    servings: recipe.servings ?? bakeDefaultServings(request.kind),
    nutrition: normalizeBakeNutrition(recipe.nutrition, request),
  };
}

function normalizeBakeNutrition(
  nutrition: RecipeNutrition | null | undefined,
  request: BakeGenerateRequest,
): RecipeNutrition | null {
  if (!nutrition) return null;
  return {
    servingG: nutrition.servingG > 0 ? nutrition.servingG : bakeServingG(request.kind),
    perServing: nutrition.perServing,
  };
}
