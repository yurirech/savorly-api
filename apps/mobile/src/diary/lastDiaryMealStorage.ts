import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DiaryMealGroup } from "@savorly/shared";
import { fetchDiaryDay } from "../api/client";

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
  const saved = await readLastDiaryMeal();
  if (saved && saved.date === date) {
    const day = await fetchDiaryDay(date);
    const meal = day.meals.find((row) => row.id === saved.mealId);
    if (meal) {
      return { id: meal.id, name: meal.name };
    }
  }
  const day = await fetchDiaryDay(date);
  if (day.meals.length === 1) {
    const only = day.meals[0];
    return only ? { id: only.id, name: only.name } : null;
  }
  return null;
}
