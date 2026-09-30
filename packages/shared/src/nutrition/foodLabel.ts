import { OPTIONAL_NUTRIENT_KEYS, roundNutrition, type NutrientVector } from "./nutrients";

export const FOOD_LABEL_NUTRIENT_KEYS = ["kcal", "proteinG", "carbsG", "fatG", ...OPTIONAL_NUTRIENT_KEYS] as const;

export type FoodLabelNutrientKey = (typeof FOOD_LABEL_NUTRIENT_KEYS)[number];

export type FoodLabelDraft = {
  name?: string | null;
  basis?: string | null;
  servingWeightG?: number | null;
  nutrients?: Partial<Record<FoodLabelNutrientKey, number | null>> | null;
};

export type FoodLabelFill = {
  name: string | null;
  per100g: Partial<NutrientVector>;
  basisNote: string | null;
};

export function foodFromLabelDraft(input: FoodLabelDraft): FoodLabelFill {
  const perServing = input.basis === "per_serving";
  const weight = input.servingWeightG;
  const canScale = perServing && typeof weight === "number" && Number.isFinite(weight) && weight > 0;
  const factor = canScale ? 100 / weight : 1;
  const per100g: Partial<NutrientVector> = {};
  const nutrients = input.nutrients ?? {};

  for (const key of FOOD_LABEL_NUTRIENT_KEYS) {
    const value = nutrients[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) continue;
    per100g[key] = key === "kcal" ? roundNutrition(value * factor, 0) : roundNutrition(value * factor);
  }

  const name = input.name?.trim() ? input.name.trim() : null;
  return {
    name,
    per100g,
    basisNote: perServing && !canScale ? "These numbers are per serving, not per 100 g." : null,
  };
}
