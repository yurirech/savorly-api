import { servingsFromGrams, type FoodAmountUnit } from "./foodServing";
import { formatDiaryNumber } from "./nutrients";
import type { DiaryEntryKind } from "./types";

export function parseAmountUnit(value: unknown): FoodAmountUnit {
  return value === "servings" ? "servings" : "grams";
}

export function formatDiaryEntryCaption(input: {
  kind: DiaryEntryKind;
  grams: number;
  kcal: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  amountUnit?: FoodAmountUnit | null;
  servingWeightG?: number | null;
}): string {
  if (input.kind === "quick") {
    return `${formatDiaryNumber(input.kcal)} kcal · ${formatDiaryNumber(input.proteinG ?? 0)}g protein · ${formatDiaryNumber(input.carbsG ?? 0)}g carbs · ${formatDiaryNumber(input.fatG ?? 0)}g fat`;
  }
  const gramsLabel = `${formatDiaryNumber(input.grams)} g`;
  const kcalLabel = `${formatDiaryNumber(input.kcal)} kcal`;
  const servingWeightG = input.servingWeightG;
  if (input.amountUnit === "servings" && servingWeightG != null && servingWeightG > 0) {
    return `${formatDiaryNumber(servingsFromGrams(input.grams, servingWeightG))} serv · ${gramsLabel} · ${kcalLabel}`;
  }
  return `${gramsLabel} · ${kcalLabel}`;
}
