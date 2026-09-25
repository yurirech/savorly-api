import { scaleNutrition, sumNutrients, type NutrientVector } from "./nutrients";

export type NutritionRecipeItemInput = {
  id: string;
  sourceLine: string;
  foodId: string | null;
  foodName?: string | null;
  grams: number | null;
  per100g?: NutrientVector | null;
};

export type NutritionRecipeComputeInput = {
  servings: number;
  cookedWeightG: number | null;
  items: NutritionRecipeItemInput[];
};

export type NutritionRecipeTotals = {
  ingredientGramsTotal: number;
  recipeWeightG: number;
  totals: NutrientVector;
  perServing: NutrientVector;
  per100g: NutrientVector;
  complete: boolean;
};

const EMPTY: NutrientVector = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

function divideNutrients(total: NutrientVector, parts: number): NutrientVector {
  if (!(parts > 0)) {
    return { ...EMPTY };
  }
  return scaleNutrition(total, 100 / parts);
}

export function isNutritionRecipeComplete(input: NutritionRecipeComputeInput): boolean {
  if (!(input.servings >= 1) || input.items.length === 0) {
    return false;
  }
  const mapped = input.items.every(
    (item) => item.foodId != null && item.per100g != null && item.grams != null && item.grams > 0,
  );
  if (!mapped) {
    return false;
  }
  const ingredientGrams = input.items.reduce((sum, item) => sum + (item.grams ?? 0), 0);
  const weight = input.cookedWeightG != null && input.cookedWeightG > 0 ? input.cookedWeightG : ingredientGrams;
  return weight > 0;
}

export function computeNutritionRecipe(input: NutritionRecipeComputeInput): NutritionRecipeTotals {
  const scaled = input.items.flatMap((item) => {
    if (item.per100g == null || item.grams == null || !(item.grams > 0)) {
      return [];
    }
    return [scaleNutrition(item.per100g, item.grams)];
  });
  const totals = scaled.length === 0 ? { ...EMPTY } : sumNutrients(scaled);
  const ingredientGramsTotal = input.items.reduce((sum, item) => sum + (item.grams ?? 0), 0);
  const recipeWeightG =
    input.cookedWeightG != null && input.cookedWeightG > 0 ? input.cookedWeightG : ingredientGramsTotal;
  const per100g = recipeWeightG > 0 ? scaleNutrition(totals, 10000 / recipeWeightG) : { ...EMPTY };
  return {
    ingredientGramsTotal,
    recipeWeightG,
    totals,
    perServing: divideNutrients(totals, input.servings),
    per100g,
    complete: isNutritionRecipeComplete(input),
  };
}
