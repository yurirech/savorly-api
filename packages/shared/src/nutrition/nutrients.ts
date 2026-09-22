export type NutrientVector = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number | null;
  sodiumMg?: number | null;
  saturatedFatG?: number | null;
  ironMg?: number | null;
  calciumMg?: number | null;
  vitaminDMcg?: number | null;
};

const OPTIONAL_KEYS = [
  "fiberG",
  "sodiumMg",
  "saturatedFatG",
  "ironMg",
  "calciumMg",
  "vitaminDMcg",
] as const;

export function roundNutrition(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function scaleNutrition(per100g: NutrientVector, grams: number): NutrientVector {
  const factor = grams / 100;
  const scaled: NutrientVector = {
    kcal: roundNutrition(per100g.kcal * factor, 0),
    proteinG: roundNutrition(per100g.proteinG * factor),
    carbsG: roundNutrition(per100g.carbsG * factor),
    fatG: roundNutrition(per100g.fatG * factor),
  };

  for (const key of OPTIONAL_KEYS) {
    const value = per100g[key];
    if (value == null) {
      continue;
    }
    scaled[key] = roundNutrition(value * factor);
  }

  return scaled;
}

export function sumNutrients(items: NutrientVector[]): NutrientVector {
  const total: NutrientVector = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const optionalSums = new Map<(typeof OPTIONAL_KEYS)[number], number>();

  for (const item of items) {
    total.kcal += item.kcal;
    total.proteinG += item.proteinG;
    total.carbsG += item.carbsG;
    total.fatG += item.fatG;
    for (const key of OPTIONAL_KEYS) {
      const value = item[key];
      if (value == null) {
        continue;
      }
      optionalSums.set(key, (optionalSums.get(key) ?? 0) + value);
    }
  }

  total.kcal = roundNutrition(total.kcal, 0);
  total.proteinG = roundNutrition(total.proteinG);
  total.carbsG = roundNutrition(total.carbsG);
  total.fatG = roundNutrition(total.fatG);
  for (const [key, value] of optionalSums) {
    total[key] = roundNutrition(value);
  }
  return total;
}

export function remainingMacros(
  targets: Pick<NutrientVector, "kcal" | "proteinG" | "carbsG" | "fatG">,
  consumed: Pick<NutrientVector, "kcal" | "proteinG" | "carbsG" | "fatG">,
): Pick<NutrientVector, "kcal" | "proteinG" | "carbsG" | "fatG"> {
  return {
    kcal: roundNutrition(targets.kcal - consumed.kcal, 0),
    proteinG: roundNutrition(targets.proteinG - consumed.proteinG),
    carbsG: roundNutrition(targets.carbsG - consumed.carbsG),
    fatG: roundNutrition(targets.fatG - consumed.fatG),
  };
}
