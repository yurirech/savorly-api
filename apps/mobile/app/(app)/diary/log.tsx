import { Redirect, useLocalSearchParams } from "expo-router";
import { todayIsoDate } from "../../../src/utils/isoDate";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function DiaryPickFoodRedirect() {
  const params = useLocalSearchParams<{ date?: string; mealId?: string; nutritionRecipeId?: string; itemId?: string }>();
  return (
    <Redirect
      href={{
        pathname: "/(app)/diary/foods",
        params: {
          date: firstParam(params.date) ?? todayIsoDate(),
          ...(firstParam(params.mealId) ? { mealId: firstParam(params.mealId) } : {}),
          ...(firstParam(params.nutritionRecipeId) ? { nutritionRecipeId: firstParam(params.nutritionRecipeId) } : {}),
          ...(firstParam(params.itemId) ? { itemId: firstParam(params.itemId) } : {}),
        },
      }}
    />
  );
}
