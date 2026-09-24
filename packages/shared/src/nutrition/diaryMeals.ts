import { sumNutrients, type NutrientVector } from "./nutrients";
import type { DiaryDayResponse, DiaryEntry, DiaryMealGroup } from "./types";

export const DIARY_MEAL_NAME_SUGGESTIONS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

/** Placeholder meal id when grouping legacy API `entries` (pre–meal-groups deploy). */
export const LEGACY_DIARY_GENERAL_MEAL_ID = "00000000-0000-4000-8000-000000000100";

export const DIARY_MEAL_NAME_MAX_LENGTH = 40;

export type DiaryMealRow = {
  id: string;
  date: string;
  name: string;
  sortOrder: number;
};

export function mealTotalsFromEntries(entries: Pick<DiaryEntry, "nutrients">[]): NutrientVector {
  if (entries.length === 0) {
    return { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  }
  return sumNutrients(entries.map((entry) => entry.nutrients));
}

export function buildDiaryMeals(
  meals: DiaryMealRow[],
  entries: DiaryEntry[],
): DiaryMealGroup[] {
  const byMeal = new Map<string, DiaryEntry[]>();
  for (const entry of entries) {
    const list = byMeal.get(entry.mealId) ?? [];
    list.push(entry);
    byMeal.set(entry.mealId, list);
  }

  return meals.map((meal) => {
    const mealEntries = byMeal.get(meal.id) ?? [];
    return {
      id: meal.id,
      date: meal.date,
      name: meal.name,
      sortOrder: meal.sortOrder,
      entries: mealEntries,
      totals: mealTotalsFromEntries(mealEntries),
    };
  });
}

export function dayTotalsFromMeals(meals: Pick<DiaryMealGroup, "totals">[]): NutrientVector {
  if (meals.length === 0) {
    return { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  }
  return sumNutrients(meals.map((meal) => meal.totals));
}

type LegacyDiaryDayPayload = {
  date: string;
  meals?: DiaryMealGroup[];
  entries?: Array<Omit<DiaryEntry, "mealId" | "date"> & { mealId?: string; date?: string }>;
  totals?: NutrientVector;
  remaining?: DiaryDayResponse["remaining"];
  targets?: DiaryDayResponse["targets"];
};

export function coerceDiaryDayResponse(raw: unknown): DiaryDayResponse {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid diary day response.");
  }
  const body = raw as LegacyDiaryDayPayload;
  if (typeof body.date !== "string") {
    throw new Error("Invalid diary day response.");
  }

  if (Array.isArray(body.meals)) {
    return {
      date: body.date,
      meals: body.meals,
      totals: body.totals ?? dayTotalsFromMeals(body.meals),
      remaining: body.remaining ?? null,
      targets: body.targets ?? null,
    };
  }

  const legacyEntries = Array.isArray(body.entries) ? body.entries : [];
  const entries: DiaryEntry[] = legacyEntries.map((item) => ({
    id: item.id,
    date: item.date ?? body.date,
    mealId: item.mealId ?? LEGACY_DIARY_GENERAL_MEAL_ID,
    kind: "food",
    foodId: item.foodId,
    foodName: item.foodName,
    grams: item.grams,
    nutrients: item.nutrients,
    createdAt: item.createdAt,
  }));

  const meals: DiaryMealGroup[] =
    entries.length === 0
      ? []
      : [
          {
            id: LEGACY_DIARY_GENERAL_MEAL_ID,
            date: body.date,
            name: "General",
            sortOrder: 0,
            entries,
            totals: body.totals ?? mealTotalsFromEntries(entries),
          },
        ];

  return {
    date: body.date,
    meals,
    totals: body.totals ?? dayTotalsFromMeals(meals),
    remaining: body.remaining ?? null,
    targets: body.targets ?? null,
  };
}
