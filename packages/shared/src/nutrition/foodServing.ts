export type FoodAmountUnit = "grams" | "servings";

export function recipeServingWeightG(recipeWeightG: number, servings: number): number | null {
  if (!(servings >= 1) || !(recipeWeightG > 0)) {
    return null;
  }
  return recipeWeightG / servings;
}

export function gramsFromServingAmount(servings: number, servingWeightG: number): number {
  return servings * servingWeightG;
}

export function servingsFromGrams(grams: number, servingWeightG: number): number {
  if (!(servingWeightG > 0)) {
    return 0;
  }
  return grams / servingWeightG;
}

export function resolveFoodGrams(
  unit: FoodAmountUnit,
  amount: number,
  servingWeightG: number | null,
): number | null {
  if (unit === "grams") {
    return amount;
  }
  if (servingWeightG == null || !(servingWeightG > 0)) {
    return null;
  }
  return gramsFromServingAmount(amount, servingWeightG);
}

export function convertFoodAmount(
  amount: number,
  from: FoodAmountUnit,
  to: FoodAmountUnit,
  servingWeightG: number | null,
): number | null {
  if (from === to) {
    return amount;
  }
  if (servingWeightG == null || !(servingWeightG > 0)) {
    return null;
  }
  if (from === "grams" && to === "servings") {
    return servingsFromGrams(amount, servingWeightG);
  }
  return gramsFromServingAmount(amount, servingWeightG);
}
