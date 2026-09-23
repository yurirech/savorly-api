import { gramsPerCupForIngredient } from "./dictionary";
import { scaleFactor, scaleQuantity } from "./scale";
import { TBSP_PER_CUP, TSP_PER_CUP, normalizeUnit, type ConvertUnit } from "./units";
import type { Ingredient } from "../recipe";

export type DisplayIngredient = {
  quantity: number | null;
  unit: string | null;
  name: string;
  notes: string | null;
  lineKind?: Ingredient["lineKind"];
};

export type DisplayUnit = "original" | "g" | "volume";

const MIN_CUP = 1 / 4;
const MIN_TBSP = 1;

export function quantityToGrams(quantity: number, unit: ConvertUnit, gramsPerCup: number): number {
  if (unit === "g") return quantity;
  if (unit === "cup") return quantity * gramsPerCup;
  if (unit === "tbsp") return quantity * (gramsPerCup / TBSP_PER_CUP);
  return quantity * (gramsPerCup / TSP_PER_CUP);
}

export function gramsToUnit(grams: number, unit: ConvertUnit, gramsPerCup: number): number {
  if (unit === "g") return grams;
  if (unit === "cup") return grams / gramsPerCup;
  if (unit === "tbsp") return grams / (gramsPerCup / TBSP_PER_CUP);
  return grams / (gramsPerCup / TSP_PER_CUP);
}

export function convertQuantity(options: {
  quantity: number;
  from: ConvertUnit;
  to: ConvertUnit;
  gramsPerCup: number;
}): number {
  const grams = quantityToGrams(options.quantity, options.from, options.gramsPerCup);
  return gramsToUnit(grams, options.to, options.gramsPerCup);
}

export function pickVolumeUnit(cups: number): ConvertUnit {
  if (cups + 1e-9 >= MIN_CUP) return "cup";
  const tbsp = cups * TBSP_PER_CUP;
  if (tbsp + 1e-9 >= MIN_TBSP) return "tbsp";
  return "tsp";
}

export function convertibleGramsPerCup(ingredient: Ingredient): number | null {
  return gramsPerCupForIngredient(ingredient.name, ingredient.canonicalKey, ingredient.gramsPerCup);
}

export function canConvertIngredient(ingredient: Ingredient): boolean {
  return (
    ingredient.quantity != null &&
    Number.isFinite(ingredient.quantity) &&
    normalizeUnit(ingredient.unit) != null &&
    convertibleGramsPerCup(ingredient) != null
  );
}

export function displayIngredient(
  ingredient: Ingredient,
  options: {
    originalServings?: number | null;
    displayServings: number;
    displayUnit: DisplayUnit;
  },
): DisplayIngredient {
  const factor = scaleFactor(options.originalServings, options.displayServings);
  const scaledQty = scaleQuantity(ingredient.quantity, factor);
  const from = normalizeUnit(ingredient.unit);
  const gramsPerCup = convertibleGramsPerCup(ingredient);

  if (options.displayUnit === "original" || scaledQty == null || !from || !gramsPerCup) {
    return {
      quantity: scaledQty,
      unit: from ?? ingredient.unit ?? null,
      name: ingredient.name,
      notes: ingredient.notes ?? null,
      lineKind: ingredient.lineKind,
    };
  }

  const grams = quantityToGrams(scaledQty, from, gramsPerCup);
  if (options.displayUnit === "g") {
    return {
      quantity: grams,
      unit: "g",
      name: ingredient.name,
      notes: ingredient.notes ?? null,
      lineKind: ingredient.lineKind,
    };
  }

  const cups = gramsToUnit(grams, "cup", gramsPerCup);
  const unit = pickVolumeUnit(cups);
  return {
    quantity: gramsToUnit(grams, unit, gramsPerCup),
    unit,
    name: ingredient.name,
    notes: ingredient.notes ?? null,
    lineKind: ingredient.lineKind,
  };
}
