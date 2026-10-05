import { type Href, Redirect, useLocalSearchParams } from "expo-router";
import { todayIsoDate } from "../../../src/utils/isoDate";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function DiaryLogFoodRedirect() {
  const params = useLocalSearchParams<{
    date?: string;
    mealId?: string;
    foodId?: string;
    entryId?: string;
  }>();
  const foodId = firstParam(params.foodId);
  const date = firstParam(params.date) ?? todayIsoDate();
  const mealId = firstParam(params.mealId);
  const entryId = firstParam(params.entryId);

  if (!foodId && !entryId) {
    return (
      <Redirect
        href={{
          pathname: "/(app)/diary/foods",
          params: {
            date,
            ...(mealId ? { mealId } : {}),
          },
        }}
      />
    );
  }

  if (!foodId) {
    return (
      <Redirect
        href={{
          pathname: "/(app)/diary",
          params: { date },
        }}
      />
    );
  }

  return (
    <Redirect
      href={{
        pathname: `/(app)/diary/food/${foodId}`,
        params: {
          date,
          ...(mealId ? { mealId } : {}),
          ...(entryId ? { entryId, returnTo: "diary" } : { returnTo: "foods" }),
        },
      } as Href}
    />
  );
}
