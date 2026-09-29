import { quantityToGrams } from "../ingredients/convert";
import { foldAlias, normalizeUnit } from "../ingredients/units";
import type { Ingredient } from "../recipe";

export type DiaryCopyFood = {
  id: string;
  name: string;
  source: string;
};

export type DiaryCopyLine = {
  sourceLine: string;
  foodId: string | null;
  grams: number | null;
};

export function diaryLinesFromCookbook(ingredients: Ingredient[], foods: DiaryCopyFood[]): DiaryCopyLine[] {
  const prepared = ingredients.flatMap((ingredient) => {
    if (isHeadingOnly(ingredient)) return [];
    const sourceLine = ingredient.name.trim();
    if (!sourceLine) return [];
    return [{ sourceLine, foodId: matchFoodId(sourceLine, foods), grams: lineGrams(ingredient) }];
  });

  const merged: DiaryCopyLine[] = [];
  const indexByKey = new Map<string, number>();
  for (const line of prepared) {
    const key = line.foodId ? `food:${line.foodId}` : `name:${foldAlias(line.sourceLine)}`;
    const existingIndex = indexByKey.get(key);
    if (existingIndex == null) {
      indexByKey.set(key, merged.length);
      merged.push(line);
      continue;
    }
    const existing = merged[existingIndex]!;
    const grams = existing.grams == null || line.grams == null ? null : existing.grams + line.grams;
    merged[existingIndex] = { ...existing, grams };
  }
  return merged;
}

function isHeadingOnly(ingredient: Ingredient): boolean {
  const hasAmount =
    (ingredient.quantity != null && Number.isFinite(ingredient.quantity)) || Boolean(ingredient.unit?.trim());
  if (hasAmount) return false;
  const name = ingredient.name.trim();
  return ingredient.lineKind === "section" || name.endsWith(":") || /^for the\b/i.test(name);
}

function lineGrams(ingredient: Ingredient): number | null {
  const quantity = ingredient.quantity;
  if (quantity == null || !(quantity > 0)) return null;
  const unit = (ingredient.unit ?? "").trim().toLowerCase();
  if (unit === "kg" || unit === "kilogram" || unit === "kilograms") return quantity * 1000;
  const normalized = normalizeUnit(ingredient.unit);
  if (normalized === "g") return quantity;
  if (normalized && ingredient.gramsPerCup && ingredient.gramsPerCup > 0) {
    return quantityToGrams(quantity, normalized, ingredient.gramsPerCup);
  }
  return null;
}

function matchFoodId(name: string, foods: DiaryCopyFood[]): string | null {
  const needle = name.trim().toLowerCase();
  if (!needle) return null;
  const hits = foods.filter((food) => food.name.trim().toLowerCase() === needle && food.source !== "recipe");
  return hits.length === 1 ? hits[0]!.id : null;
}
