import type { NutrientVector } from "./nutrients";

export const QUICK_DIARY_ENTRY_GRAMS = 100;
export const QUICK_DIARY_DEFAULT_LABEL = "Quick entry";
export const QUICK_DIARY_LABEL_MAX_LENGTH = 80;

export type QuickDiaryNutrientsInput = {
  kcal: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
};

export function parseQuickDiaryLabel(label?: string | null): string {
  const trimmed = label?.trim();
  if (!trimmed) {
    return QUICK_DIARY_DEFAULT_LABEL;
  }
  return trimmed.slice(0, QUICK_DIARY_LABEL_MAX_LENGTH);
}

export function buildQuickDiaryNutrients(input: QuickDiaryNutrientsInput): NutrientVector {
  return {
    kcal: input.kcal,
    proteinG: input.proteinG ?? 0,
    carbsG: input.carbsG ?? 0,
    fatG: input.fatG ?? 0,
  };
}

export function validateQuickDiaryKcal(kcal: number): boolean {
  return typeof kcal === "number" && Number.isFinite(kcal) && kcal >= 0;
}
