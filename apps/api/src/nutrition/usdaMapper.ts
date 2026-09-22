import type { NutrientVector, UsdaFoodHit } from "@savorly/shared";

const FDC_NUMBERS = {
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
} as const;

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

  return {
    kcal,
    proteinG,
    carbsG,
    fatG,
    fiberG: byNumber.get(FDC_NUMBERS.fiberG) ?? null,
    sodiumMg: byNumber.get(FDC_NUMBERS.sodiumMg) ?? null,
    saturatedFatG: byNumber.get(FDC_NUMBERS.saturatedFatG) ?? null,
    ironMg: byNumber.get(FDC_NUMBERS.ironMg) ?? null,
    calciumMg: byNumber.get(FDC_NUMBERS.calciumMg) ?? null,
    vitaminDMcg: byNumber.get(FDC_NUMBERS.vitaminDMcg) ?? null,
  };
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
