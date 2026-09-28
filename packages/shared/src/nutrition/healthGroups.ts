import { roundNutrition, type NutrientVector } from "./nutrients";
import type { NutritionSex, NutritionTargets } from "./targets";

export type HealthNutrientUnit = "g" | "mg" | "mcg";

export type HealthGroupId = "electrolytes" | "bone" | "energy" | "blood" | "immune";

type IntakeKey =
  | "proteinG"
  | "carbsG"
  | "fatG"
  | "saturatedFatG"
  | "fiberG"
  | "sodiumMg"
  | "potassiumMg"
  | "calciumMg"
  | "magnesiumMg"
  | "phosphorusMg"
  | "vitaminDMcg"
  | "vitaminKMcg"
  | "ironMg"
  | "zincMg"
  | "vitaminAMcgRae"
  | "vitaminCMg"
  | "thiaminMg"
  | "riboflavinMg"
  | "niacinMg"
  | "vitaminB6Mg"
  | "vitaminB12Mcg"
  | "folateMcg";

export type DayIntakeTargets = Record<IntakeKey, number>;

export type HealthNutrient = {
  id: string;
  label: string;
  unit: HealthNutrientUnit;
  intakeKey?: IntakeKey;
};

export type HealthGroup = {
  id: HealthGroupId;
  label: string;
  summary: string;
  nutrients: HealthNutrient[];
};

const DEFAULT_KCAL = 2000;

const MICRO_BY_SEX: Record<NutritionSex | "adult", Omit<DayIntakeTargets, "proteinG" | "carbsG" | "fatG" | "saturatedFatG" | "fiberG">> = {
  male: {
    sodiumMg: 2300,
    potassiumMg: 3400,
    calciumMg: 1000,
    magnesiumMg: 420,
    phosphorusMg: 700,
    vitaminDMcg: 15,
    vitaminKMcg: 120,
    ironMg: 8,
    zincMg: 11,
    vitaminAMcgRae: 900,
    vitaminCMg: 90,
    thiaminMg: 1.2,
    riboflavinMg: 1.3,
    niacinMg: 16,
    vitaminB6Mg: 1.3,
    vitaminB12Mcg: 2.4,
    folateMcg: 400,
  },
  female: {
    sodiumMg: 2300,
    potassiumMg: 2600,
    calciumMg: 1000,
    magnesiumMg: 320,
    phosphorusMg: 700,
    vitaminDMcg: 15,
    vitaminKMcg: 90,
    ironMg: 18,
    zincMg: 8,
    vitaminAMcgRae: 700,
    vitaminCMg: 75,
    thiaminMg: 1.1,
    riboflavinMg: 1.1,
    niacinMg: 14,
    vitaminB6Mg: 1.3,
    vitaminB12Mcg: 2.4,
    folateMcg: 400,
  },
  adult: {
    sodiumMg: 2300,
    potassiumMg: 3400,
    calciumMg: 1000,
    magnesiumMg: 400,
    phosphorusMg: 700,
    vitaminDMcg: 15,
    vitaminKMcg: 120,
    ironMg: 18,
    zincMg: 11,
    vitaminAMcgRae: 900,
    vitaminCMg: 90,
    thiaminMg: 1.2,
    riboflavinMg: 1.3,
    niacinMg: 16,
    vitaminB6Mg: 1.3,
    vitaminB12Mcg: 2.4,
    folateMcg: 400,
  },
};

export const HEALTH_GROUPS: HealthGroup[] = [
  {
    id: "electrolytes",
    label: "Electrolytes",
    summary: "Minerals that keep fluid balance and nerve signals working.",
    nutrients: [
      { id: "sodiumMg", label: "Sodium", unit: "mg", intakeKey: "sodiumMg" },
      { id: "potassiumMg", label: "Potassium", unit: "mg", intakeKey: "potassiumMg" },
      { id: "calciumMg", label: "Calcium", unit: "mg", intakeKey: "calciumMg" },
      { id: "magnesiumMg", label: "Magnesium", unit: "mg", intakeKey: "magnesiumMg" },
      { id: "phosphorusMg", label: "Phosphorus", unit: "mg", intakeKey: "phosphorusMg" },
    ],
  },
  {
    id: "bone",
    label: "Bone health",
    summary: "Nutrients that build and keep bone.",
    nutrients: [
      { id: "calciumMg", label: "Calcium", unit: "mg", intakeKey: "calciumMg" },
      { id: "vitaminDMcg", label: "Vitamin D", unit: "mcg", intakeKey: "vitaminDMcg" },
      { id: "magnesiumMg", label: "Magnesium", unit: "mg", intakeKey: "magnesiumMg" },
      { id: "phosphorusMg", label: "Phosphorus", unit: "mg", intakeKey: "phosphorusMg" },
      { id: "vitaminKMcg", label: "Vitamin K", unit: "mcg", intakeKey: "vitaminKMcg" },
      { id: "proteinG", label: "Protein", unit: "g", intakeKey: "proteinG" },
    ],
  },
  {
    id: "energy",
    label: "Energy support",
    summary: "B vitamins and minerals that help cells turn food into fuel.",
    nutrients: [
      { id: "thiaminMg", label: "Thiamin", unit: "mg", intakeKey: "thiaminMg" },
      { id: "riboflavinMg", label: "Riboflavin", unit: "mg", intakeKey: "riboflavinMg" },
      { id: "niacinMg", label: "Niacin", unit: "mg", intakeKey: "niacinMg" },
      { id: "vitaminB6Mg", label: "Vitamin B6", unit: "mg", intakeKey: "vitaminB6Mg" },
      { id: "vitaminB12Mcg", label: "Vitamin B12", unit: "mcg", intakeKey: "vitaminB12Mcg" },
      { id: "pantothenicAcidMg", label: "Pantothenic acid", unit: "mg" },
      { id: "biotinMcg", label: "Biotin", unit: "mcg" },
      { id: "ironMg", label: "Iron", unit: "mg", intakeKey: "ironMg" },
      { id: "manganeseMg", label: "Manganese", unit: "mg" },
      { id: "magnesiumMg", label: "Magnesium", unit: "mg", intakeKey: "magnesiumMg" },
    ],
  },
  {
    id: "blood",
    label: "Blood health",
    summary: "Nutrients used to make healthy blood cells.",
    nutrients: [
      { id: "ironMg", label: "Iron", unit: "mg", intakeKey: "ironMg" },
      { id: "vitaminB12Mcg", label: "Vitamin B12", unit: "mcg", intakeKey: "vitaminB12Mcg" },
      { id: "vitaminB6Mg", label: "Vitamin B6", unit: "mg", intakeKey: "vitaminB6Mg" },
      { id: "folateMcg", label: "Folate", unit: "mcg", intakeKey: "folateMcg" },
      { id: "vitaminCMg", label: "Vitamin C", unit: "mg", intakeKey: "vitaminCMg" },
    ],
  },
  {
    id: "immune",
    label: "Immune support",
    summary: "Nutrients that support the immune system.",
    nutrients: [
      { id: "proteinG", label: "Protein", unit: "g", intakeKey: "proteinG" },
      { id: "vitaminAMcgRae", label: "Vitamin A", unit: "mcg", intakeKey: "vitaminAMcgRae" },
      { id: "vitaminCMg", label: "Vitamin C", unit: "mg", intakeKey: "vitaminCMg" },
      { id: "vitaminDMcg", label: "Vitamin D", unit: "mcg", intakeKey: "vitaminDMcg" },
      { id: "zincMg", label: "Zinc", unit: "mg", intakeKey: "zincMg" },
    ],
  },
];

export function dayIntakeTargets(
  targets: NutritionTargets | null,
  sex: NutritionSex | null,
): DayIntakeTargets {
  const kcal = targets?.kcal ?? DEFAULT_KCAL;
  const micros = MICRO_BY_SEX[sex ?? "adult"];
  return {
    proteinG: targets?.proteinG ?? Math.round((kcal * 0.3) / 4),
    carbsG: targets?.carbsG ?? Math.round((kcal * 0.4) / 4),
    fatG: targets?.fatG ?? Math.round((kcal * 0.3) / 9),
    saturatedFatG: roundNutrition((kcal * 0.1) / 9),
    fiberG: roundNutrition((kcal / 1000) * 14),
    ...micros,
  };
}

export function healthNutrientAmount(totals: NutrientVector, nutrient: HealthNutrient): number | null {
  if (!nutrient.intakeKey) {
    return null;
  }
  const value = totals[nutrient.intakeKey];
  return value == null ? null : value;
}

export function cappedProgress(amount: number | null, target: number): number | null {
  if (amount == null || !(target > 0)) {
    return null;
  }
  return Math.min(amount / target, 1);
}

export function healthGroupPercent(totals: NutrientVector, group: HealthGroup, intakes: DayIntakeTargets): number | null {
  const ratios = group.nutrients.map((nutrient) => {
    if (!nutrient.intakeKey) {
      return null;
    }
    return cappedProgress(healthNutrientAmount(totals, nutrient), intakes[nutrient.intakeKey]);
  });
  const present = ratios.filter((ratio): ratio is number => ratio != null);
  if (present.length === 0) {
    return null;
  }
  const average = present.reduce((sum, ratio) => sum + ratio, 0) / present.length;
  return Math.round(average * 100);
}

export function macroCalorieShares(totals: Pick<NutrientVector, "proteinG" | "carbsG" | "fatG">): {
  protein: number;
  carbs: number;
  fat: number;
} {
  const protein = Math.max(0, totals.proteinG) * 4;
  const carbs = Math.max(0, totals.carbsG) * 4;
  const fat = Math.max(0, totals.fatG) * 9;
  const total = protein + carbs + fat;
  if (total <= 0) {
    return { protein: 0, carbs: 0, fat: 0 };
  }
  return {
    protein: protein / total,
    carbs: carbs / total,
    fat: fat / total,
  };
}

export function findHealthGroup(id: string): HealthGroup | undefined {
  return HEALTH_GROUPS.find((group) => group.id === id);
}
