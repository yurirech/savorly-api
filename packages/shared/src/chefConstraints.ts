import type { ChefMealType } from "./recipe";

export const CHEF_SERVING_WEIGHT_G = {
  main: { min: 350, max: 550 },
  side: { min: 150, max: 250 },
  snack: { min: 80, max: 150 },
} as const;

export function chefServingWeightHint(mealType: ChefMealType): string {
  const range = CHEF_SERVING_WEIGHT_G[mealType];
  return `${range.min}–${range.max}`;
}

export function chefServingWeightG(mealType: ChefMealType): number {
  const range = CHEF_SERVING_WEIGHT_G[mealType];
  return Math.round((range.min + range.max) / 2);
}
