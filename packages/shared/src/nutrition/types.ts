import type { FoodAmountUnit } from "./foodServing";
import type { DayIntakeTargets, MicroTargets } from "./healthGroups";
import type { NutrientVector } from "./nutrients";
import type { NutritionProfileInput, NutritionTargets } from "./targets";

export type UserFoodSource = "usda" | "manual" | "nevo" | "recipe" | "fatsecret";

export type NutritionProfile = NutritionProfileInput & {
  updatedAt: string;
  microTargets?: MicroTargets | null;
};

export type NutritionProfileWrite = NutritionProfileInput & {
  microTargets?: MicroTargets | null;
};

export type NutritionProfileResponse = {
  profile: NutritionProfile | null;
  targets: NutritionTargets | null;
  intakeTargets?: DayIntakeTargets | null;
};

export type UserFood = {
  id: string;
  name: string;
  originalName: string;
  source: UserFoodSource;
  fdcId: number | null;
  fatsecretId?: number | null;
  nevoCode: number | null;
  nutritionRecipeId: string | null;
  servingWeightG: number | null;
  category: string | null;
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

export type FatsecretFoodHit = {
  foodId: number;
  name: string;
  brandName?: string;
  foodType: string;
};

export const NEVO_ATTRIBUTION = "NEVO-online version 2025/9.0, RIVM, Bilthoven";
export const FATSECRET_ATTRIBUTION = "Powered by FatSecret";

export type UserFoodDetail = UserFood & {
  attribution?: string;
};

export type DiaryEntryKind = "food" | "quick";

export type DiaryEntry = {
  id: string;
  date: string;
  mealId: string;
  kind: DiaryEntryKind;
  foodId: string | null;
  label?: string;
  foodName: string;
  category?: string | null;
  grams: number;
  amountUnit?: FoodAmountUnit;
  nutrients: NutrientVector;
  createdAt: string;
};

export type DiaryMealStaple = {
  foodId: string;
  name: string;
};

export type DiaryMealGroup = {
  id: string;
  date: string;
  name: string;
  sortOrder: number;
  totals: NutrientVector;
  entries: DiaryEntry[];
  canCopyPrevious?: boolean;
  stapleCount?: number;
  staples?: DiaryMealStaple[];
};

export type DiaryDayResponse = {
  date: string;
  meals: DiaryMealGroup[];
  totals: NutrientVector;
  remaining: Pick<NutrientVector, "kcal" | "proteinG" | "carbsG" | "fatG"> | null;
  targets: NutritionTargets | null;
};
