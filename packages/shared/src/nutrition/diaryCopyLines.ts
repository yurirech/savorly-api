import { quantityToGrams } from "../ingredients/convert";
import { foldAlias, normalizeUnit } from "../ingredients/units";
import type { Ingredient } from "../recipe";

export type DiaryCopyFood = {
  id: string;
  name: string;
  originalName?: string | null;
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
    return [{ sourceLine, foodId: matchCopyFoodId(sourceLine, foods), grams: lineGrams(ingredient) }];
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

const MATCH_STOPWORDS = new Set(["of", "the", "and", "a", "an", "en", "de", "het", "van", "met", "or"]);

export function matchCopyFoodId(name: string, foods: DiaryCopyFood[]): string | null {
  const needle = foldAlias(name);
  if (!needle) return null;
  const needleTokens = matchTokens(needle);
  const candidates = foods
    .filter((food) => food.source !== "recipe")
    .map((food) => ({ id: food.id, labels: foodLabels(food) }));

  const tiers: Array<(label: string) => boolean> = [
    (label) => label === needle,
    (label) => sameTokens(matchTokens(label), needleTokens),
    (label) => tokensContain(matchTokens(label), needleTokens) || tokensContain(needleTokens, matchTokens(label)),
  ];
  for (const test of tiers) {
    const hits = new Set(candidates.filter((food) => food.labels.some(test)).map((food) => food.id));
    if (hits.size === 1) return [...hits][0]!;
    if (hits.size > 1) return null;
  }
  return null;
}

function foodLabels(food: DiaryCopyFood): string[] {
  return [food.name, food.originalName ?? ""].map(foldAlias).filter(Boolean);
}

function matchTokens(value: string): string[] {
  return value
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 1 && !MATCH_STOPWORDS.has(token));
}

function sameTokens(a: string[], b: string[]): boolean {
  if (a.length === 0 || a.length !== b.length) return false;
  return a.every((token) => b.includes(token));
}

function tokensContain(container: string[], subset: string[]): boolean {
  return subset.length > 0 && subset.every((token) => container.includes(token));
}
