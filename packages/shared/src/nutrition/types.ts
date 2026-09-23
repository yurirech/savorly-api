import type { NutrientVector } from "./nutrients";
import type { NutritionProfileInput, NutritionTargets } from "./targets";

export type UserFoodSource = "usda" | "manual" | "nevo";

export type NutritionProfile = NutritionProfileInput & {
  updatedAt: string;
};

export type NutritionProfileResponse = {
  profile: NutritionProfile | null;
  targets: NutritionTargets | null;
};

export type UserFood = {
  id: string;
  name: string;
  source: UserFoodSource;
  fdcId: number | null;
  nevoCode: number | null;
  per100g: NutrientVector;
  createdAt: string;
  updatedAt: string;
};

export type UsdaFoodHit = {
  fdcId: number;
  name: string;
  dataType: string;
};

export type NevoFoodHit = {
  nevoCode: number;
  name: string;
  nameEn: string;
  foodGroup: string;
  version: string;
};

export const NEVO_ATTRIBUTION = "NEVO-online version 2025/9.0, RIVM, Bilthoven";

export type DiaryEntry = {
  id: string;
  date: string;
  foodId: string;
  foodName: string;
  grams: number;
  nutrients: NutrientVector;
  createdAt: string;
};

export type DiaryDayResponse = {
  date: string;
  entries: DiaryEntry[];
  totals: NutrientVector;
  remaining: Pick<NutrientVector, "kcal" | "proteinG" | "carbsG" | "fatG"> | null;
  targets: NutritionTargets | null;
};
