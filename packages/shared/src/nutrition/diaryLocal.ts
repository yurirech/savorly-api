import type { DiaryDayResponse, DiaryEntry, DiaryMealGroup } from "./types";
import type { NutrientVector } from "./nutrients";

export type SeededMeal = { id: string; name: string };

export type MergeRemoteDayResult = {
  day: DiaryDayResponse;
  mealIdMap: Record<string, string>;
};

const emptyTotals = (): NutrientVector => ({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });

export function emptyDiaryDay(date: string): DiaryDayResponse {
  return { date, meals: [], totals: emptyTotals(), remaining: null, targets: null };
}

export function mostRecentCachedDay(days: DiaryDayResponse[], date: string): DiaryDayResponse | null {
  const withMeals = days.filter((day) => day.date !== date && day.meals.length > 0);
  const earlier = withMeals.filter((day) => day.date < date).sort((a, b) => b.date.localeCompare(a.date));
  if (earlier[0]) return earlier[0];
  return withMeals.sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

export function seedDayFromSource(
  date: string,
  source: DiaryDayResponse | null,
  newId: () => string,
): { day: DiaryDayResponse; seededMeals: SeededMeal[] } {
  if (!source) {
    return { day: emptyDiaryDay(date), seededMeals: [] };
  }
  const seededMeals: SeededMeal[] = [];
  const meals = [...source.meals]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((meal, index) => {
      const id = newId();
      seededMeals.push({ id, name: meal.name });
      return {
        id,
        date,
        name: meal.name,
        sortOrder: meal.sortOrder ?? index,
        totals: emptyTotals(),
        entries: [] as DiaryEntry[],
        stapleCount: meal.stapleCount,
        canCopyPrevious: Boolean(meal.canCopyPrevious) || meal.entries.length > 0,
      };
    });
  return {
    day: {
      date,
      meals,
      totals: emptyTotals(),
      remaining: null,
      targets: source.targets ?? null,
    },
    seededMeals,
  };
}

export function resolveLocalDiaryDay(
  date: string,
  cached: DiaryDayResponse | null,
  days: DiaryDayResponse[],
  newId: () => string,
): { day: DiaryDayResponse; seededMeals: SeededMeal[] } {
  if (cached) return { day: cached, seededMeals: [] };
  return seedDayFromSource(date, mostRecentCachedDay(days, date), newId);
}

export function mergeRemoteDay(
  local: DiaryDayResponse | null,
  remote: DiaryDayResponse,
): MergeRemoteDayResult {
  if (!local) return { day: remote, mealIdMap: {} };

  const mealIdMap: Record<string, string> = {};
  const usedLocal = new Set<string>();
  const meals: DiaryMealGroup[] = [];

  for (const remoteMeal of remote.meals) {
    const localMeal = local.meals.find((meal) => meal.name === remoteMeal.name && !usedLocal.has(meal.id));
    if (!localMeal) {
      meals.push(remoteMeal);
      continue;
    }
    usedLocal.add(localMeal.id);
    if (localMeal.id !== remoteMeal.id) {
      mealIdMap[localMeal.id] = remoteMeal.id;
    }
    meals.push({
      ...remoteMeal,
      stapleCount: localMeal.stapleCount ?? remoteMeal.stapleCount,
      canCopyPrevious: remoteMeal.canCopyPrevious ?? localMeal.canCopyPrevious,
      entries: mergeMealEntries(localMeal.entries, remoteMeal.entries, remoteMeal.id),
    });
  }

  for (const localMeal of local.meals) {
    if (usedLocal.has(localMeal.id)) continue;
    meals.push(localMeal);
  }

  meals.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return {
    day: {
      ...remote,
      meals,
    },
    mealIdMap,
  };
}

function mergeMealEntries(local: DiaryEntry[], remote: DiaryEntry[], mealId: string): DiaryEntry[] {
  const localById = new Map(local.map((entry) => [entry.id, entry]));
  const remoteIds = new Set(remote.map((entry) => entry.id));
  const merged = remote.map((entry) => withMealId(localById.get(entry.id) ?? entry, mealId));
  for (const entry of local) {
    if (!remoteIds.has(entry.id)) merged.push(withMealId(entry, mealId));
  }
  return merged;
}

function withMealId(entry: DiaryEntry, mealId: string): DiaryEntry {
  return entry.mealId === mealId ? entry : { ...entry, mealId };
}
