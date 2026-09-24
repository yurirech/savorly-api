import type { NutrientVector, UsdaFoodHit } from "@savorly/shared";

export const FDC_NUMBERS = {
  kcal: "208",
  proteinG: "203",
  carbsG: "205",
  fatG: "204",
  fiberG: "291",
  sodiumMg: "307",
  saturatedFatG: "606",
  ironMg: "303",
  calciumMg: "301",
  vitaminDMcg: "328",
  potassiumMg: "306",
  phosphorusMg: "305",
  magnesiumMg: "304",
  zincMg: "309",
  copperMg: "312",
  seleniumMcg: "317",
  vitaminAMcgRae: "320",
  vitaminEMg: "323",
  vitaminKMcg: "430",
  vitaminCMg: "401",
  thiaminMg: "404",
  riboflavinMg: "405",
  vitaminB6Mg: "415",
  vitaminB12Mcg: "418",
  niacinMg: "406",
  folateMcg: "417",
  sugarsG: "269",
  cholesterolMg: "601",
  transFatG: "605",
  monoFatG: "645",
} as const;

const OPTIONAL_FIELDS: {
  field: keyof NutrientVector;
  fdcNumber: (typeof FDC_NUMBERS)[keyof typeof FDC_NUMBERS];
}[] = [
  { field: "fiberG", fdcNumber: FDC_NUMBERS.fiberG },
  { field: "sodiumMg", fdcNumber: FDC_NUMBERS.sodiumMg },
  { field: "saturatedFatG", fdcNumber: FDC_NUMBERS.saturatedFatG },
  { field: "ironMg", fdcNumber: FDC_NUMBERS.ironMg },
  { field: "calciumMg", fdcNumber: FDC_NUMBERS.calciumMg },
  { field: "vitaminDMcg", fdcNumber: FDC_NUMBERS.vitaminDMcg },
  { field: "potassiumMg", fdcNumber: FDC_NUMBERS.potassiumMg },
  { field: "phosphorusMg", fdcNumber: FDC_NUMBERS.phosphorusMg },
  { field: "magnesiumMg", fdcNumber: FDC_NUMBERS.magnesiumMg },
  { field: "zincMg", fdcNumber: FDC_NUMBERS.zincMg },
  { field: "copperMg", fdcNumber: FDC_NUMBERS.copperMg },
  { field: "seleniumMcg", fdcNumber: FDC_NUMBERS.seleniumMcg },
  { field: "vitaminAMcgRae", fdcNumber: FDC_NUMBERS.vitaminAMcgRae },
  { field: "vitaminEMg", fdcNumber: FDC_NUMBERS.vitaminEMg },
  { field: "vitaminKMcg", fdcNumber: FDC_NUMBERS.vitaminKMcg },
  { field: "vitaminCMg", fdcNumber: FDC_NUMBERS.vitaminCMg },
  { field: "thiaminMg", fdcNumber: FDC_NUMBERS.thiaminMg },
  { field: "riboflavinMg", fdcNumber: FDC_NUMBERS.riboflavinMg },
  { field: "vitaminB6Mg", fdcNumber: FDC_NUMBERS.vitaminB6Mg },
  { field: "vitaminB12Mcg", fdcNumber: FDC_NUMBERS.vitaminB12Mcg },
  { field: "niacinMg", fdcNumber: FDC_NUMBERS.niacinMg },
  { field: "folateMcg", fdcNumber: FDC_NUMBERS.folateMcg },
  { field: "sugarsG", fdcNumber: FDC_NUMBERS.sugarsG },
  { field: "cholesterolMg", fdcNumber: FDC_NUMBERS.cholesterolMg },
  { field: "transFatG", fdcNumber: FDC_NUMBERS.transFatG },
  { field: "monoFatG", fdcNumber: FDC_NUMBERS.monoFatG },
];

const PREFERRED_DATA_TYPES = new Set(["Foundation", "SR Legacy"]);

type FdcNutrient = {
  amount?: number;
  value?: number;
  nutrientNumber?: string | number;
  nutrient?: {
    number?: string | number;
    nutrientNumber?: string | number;
  };
};

type FdcFood = {
  fdcId?: number;
  description?: string;
  dataType?: string;
  foodNutrients?: FdcNutrient[];
};

type FdcSearchFood = {
  fdcId?: number;
  description?: string;
  dataType?: string;
};

export function nutrientNumber(item: FdcNutrient): string {
  const raw = item.nutrientNumber ?? item.nutrient?.number ?? item.nutrient?.nutrientNumber;
  return raw == null ? "" : String(raw);
}

export function nutrientAmount(item: FdcNutrient): number | null {
  const value = item.amount ?? item.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function mapFdcFoodToNutrients(food: FdcFood | Record<string, unknown>): NutrientVector {
  const byNumber = new Map<string, number>();
  const nutrients = Array.isArray(food.foodNutrients) ? (food.foodNutrients as FdcNutrient[]) : [];
  for (const item of nutrients) {
    const number = nutrientNumber(item);
    const amount = nutrientAmount(item);
    if (!number || amount == null) {
      continue;
    }
    byNumber.set(number, amount);
  }

  const kcal = byNumber.get(FDC_NUMBERS.kcal);
  const proteinG = byNumber.get(FDC_NUMBERS.proteinG);
  const carbsG = byNumber.get(FDC_NUMBERS.carbsG);
  const fatG = byNumber.get(FDC_NUMBERS.fatG);
  if (kcal == null || proteinG == null || carbsG == null || fatG == null) {
    throw new Error("USDA food is missing calorie or macro data.");
  }

  const mapped: NutrientVector = {
    kcal,
    proteinG,
    carbsG,
    fatG,
  };

  for (const { field, fdcNumber } of OPTIONAL_FIELDS) {
    const value = byNumber.get(fdcNumber);
    if (value != null) {
      mapped[field] = value;
    }
  }

  return mapped;
}

export function mapFdcSearchHits(foods: unknown[], limit = 10): UsdaFoodHit[] {
  const rows = foods.filter((food): food is FdcSearchFood => Boolean(food) && typeof food === "object");
  const preferred = rows.filter((food) => food.dataType && PREFERRED_DATA_TYPES.has(food.dataType));
  const pool = preferred.length > 0 ? preferred : rows;
  return pool
    .filter((food): food is FdcSearchFood & { fdcId: number; description: string } => {
      return typeof food.fdcId === "number" && Boolean(food.description?.trim());
    })
    .slice(0, limit)
    .map((food) => ({
      fdcId: food.fdcId,
      name: food.description.trim(),
      dataType: food.dataType ?? "unknown",
    }));
}

export function fdcFoodName(food: FdcFood | Record<string, unknown>, fallback?: string): string {
  const description = typeof food.description === "string" ? food.description : "";
  const name = description.trim() || fallback?.trim();
  if (!name) {
    throw new Error("USDA food is missing a name.");
  }
  return name;
}
