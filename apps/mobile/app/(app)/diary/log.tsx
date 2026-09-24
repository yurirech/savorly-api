import { type Href, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import type { UserFood } from "@savorly/shared";
import { ApiRequestError, listNutritionFoods } from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Screen } from "../../../src/components/Screen";
import { tokens } from "../../../src/theme/tokens";
import { todayIsoDate } from "../../../src/utils/isoDate";

export default function DiaryPickFoodScreen() {
  const params = useLocalSearchParams<{ date?: string; mealId?: string }>();
  const date = Array.isArray(params.date) ? params.date[0] : params.date ?? todayIsoDate();
  const mealId = Array.isArray(params.mealId) ? params.mealId[0] : params.mealId;
  const [foods, setFoods] = useState<UserFood[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void listNutritionFoods()
        .then((live) => {
          setFoods(live.foods);
          setError(null);
        })
        .catch((err) => {
          setError(err instanceof ApiRequestError ? err.message : "Could not load foods.");
        });
    }, []),
  );

  function onPick(foodId: string) {
    if (!mealId) {
      setError("Missing meal group.");
      return;
    }
    router.push({
      pathname: "/(app)/diary/log-food",
      params: { date, mealId, foodId },
    } as Href);
  }

  return (
    <Screen>
      <AppText variant="display">Pick food</AppText>
      <AppText variant="body" color="muted">
        Choose a food to log in this meal group.
      </AppText>
      {foods.length === 0 ? (
        <AppText variant="body" color="muted">
          Add foods you actually eat first.
        </AppText>
      ) : null}
      {foods.map((food) => (
        <Pressable
          key={food.id}
          onPress={() => onPick(food.id)}
          style={styles.food}
          accessibilityRole="button"
          accessibilityLabel={food.name}
        >
          <AppText variant="title">{food.name}</AppText>
          <AppText variant="caption" color="muted">
            {food.per100g.kcal} kcal / 100 g
          </AppText>
        </Pressable>
      ))}
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  food: {
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.surface,
    gap: tokens.space.xs,
  },
});
