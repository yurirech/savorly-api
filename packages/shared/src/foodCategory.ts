export const FOOD_CATEGORIES = [
  "cake",
  "muffin",
  "bread",
  "cookie",
  "dessert",
  "pasta",
  "rice",
  "soup",
  "salad",
  "breakfast",
  "meat",
  "fish",
  "vegetarian",
  "drink",
  "snack",
  "other",
] as const;

export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export function isFoodCategory(value: string): value is FoodCategory {
  return (FOOD_CATEGORIES as readonly string[]).includes(value);
}

export function parseFoodCategory(value: unknown): FoodCategory {
  if (typeof value === "string" && isFoodCategory(value)) {
    return value;
  }
  return "other";
}
