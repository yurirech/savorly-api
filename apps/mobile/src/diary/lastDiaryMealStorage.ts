import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DiaryMealGroup } from "@savorly/shared";

const KEYS = {
  mealId: "diary:lastMealId",
  mealDate: "diary:lastMealDate",
  mealName: "diary:lastMealName",
} as const;

export type LastDiaryMealPreference = {
  mealId: string;
  mealName: string;
  date: string;
};

export async function readLastDiaryMeal(): Promise<LastDiaryMealPreference | null> {
  const [mealId, mealDate, mealName] = await AsyncStorage.multiGet([
    KEYS.mealId,
    KEYS.mealDate,
    KEYS.mealName,
  ]);
  const id = mealId[1];
  const date = mealDate[1];
  const name = mealName[1];
  if (!id || !date || !name) {
    return null;
  }
  return { mealId: id, mealName: name, date };
}

export async function writeLastDiaryMeal(input: LastDiaryMealPreference): Promise<void> {
  await AsyncStorage.multiSet([
    [KEYS.mealId, input.mealId],
    [KEYS.mealDate, input.date],
    [KEYS.mealName, input.mealName],
  ]);
}

export async function resolveMealForDate(date: string): Promise<Pick<DiaryMealGroup, "id" | "name"> | null> {
  const { openLocalDiaryDay } = await import("../offline/sync");
  const saved = await readLastDiaryMeal();
  const day = await openLocalDiaryDay(date);
  if (saved) {
    const meal =
      (saved.date === date ? day.meals.find((row) => row.id === saved.mealId) : undefined) ??
      day.meals.find((row) => row.name === saved.mealName);
    if (meal) {
      return { id: meal.id, name: meal.name };
    }
  }
  if (day.meals.length === 1) {
    const only = day.meals[0];
    return only ? { id: only.id, name: only.name } : null;
  }
  return null;
}
