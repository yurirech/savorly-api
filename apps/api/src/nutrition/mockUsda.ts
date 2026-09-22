import type { NutrientVector, UsdaFoodHit } from "@savorly/shared";

export type MockUsdaFood = UsdaFoodHit & { per100g: NutrientVector };

export const MOCK_USDA_FOODS: MockUsdaFood[] = [
  {
    fdcId: 1100001,
    name: "Peanut butter",
    dataType: "SR Legacy",
    per100g: { kcal: 588, proteinG: 25, carbsG: 20, fatG: 50, fiberG: 6, sodiumMg: 429, saturatedFatG: 10, ironMg: 1.9, calciumMg: 49, vitaminDMcg: 0 },
  },
  {
    fdcId: 1100002,
    name: "Milk, nonfat, fluid",
    dataType: "Foundation",
    per100g: { kcal: 34, proteinG: 3.4, carbsG: 5, fatG: 0.1, fiberG: 0, sodiumMg: 42, saturatedFatG: 0.1, ironMg: 0, calciumMg: 122, vitaminDMcg: 1.2 },
  },
  {
    fdcId: 1100003,
    name: "Chicken, broiler, breast, raw",
    dataType: "Foundation",
    per100g: { kcal: 120, proteinG: 23, carbsG: 0, fatG: 2.6, fiberG: 0, sodiumMg: 45, saturatedFatG: 0.6, ironMg: 0.4, calciumMg: 5, vitaminDMcg: 0 },
  },
  {
    fdcId: 1100004,
    name: "Chicken, broiler, breast, cooked",
    dataType: "SR Legacy",
    per100g: { kcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6, fiberG: 0, sodiumMg: 74, saturatedFatG: 1, ironMg: 1, calciumMg: 15, vitaminDMcg: 0.1 },
  },
  {
    fdcId: 1100005,
    name: "Rice, white, basmati, raw",
    dataType: "SR Legacy",
    per100g: { kcal: 360, proteinG: 7.5, carbsG: 79, fatG: 0.8, fiberG: 1.3, sodiumMg: 1, saturatedFatG: 0.2, ironMg: 0.8, calciumMg: 10, vitaminDMcg: 0 },
  },
  {
    fdcId: 1100006,
    name: "Rice, white, basmati, cooked",
    dataType: "SR Legacy",
    per100g: { kcal: 121, proteinG: 3.5, carbsG: 25, fatG: 0.4, fiberG: 0.4, sodiumMg: 1, saturatedFatG: 0.1, ironMg: 0.2, calciumMg: 4, vitaminDMcg: 0 },
  },
];

export function searchMockUsdaFoods(query: string): UsdaFoodHit[] {
  const folded = query.trim().toLowerCase();
  if (!folded) {
    return MOCK_USDA_FOODS.map(({ fdcId, name, dataType }) => ({ fdcId, name, dataType }));
  }
  return MOCK_USDA_FOODS.filter((food) => food.name.toLowerCase().includes(folded)).map(({ fdcId, name, dataType }) => ({
    fdcId,
    name,
    dataType,
  }));
}

export function getMockUsdaFood(fdcId: number): MockUsdaFood | undefined {
  return MOCK_USDA_FOODS.find((food) => food.fdcId === fdcId);
}
