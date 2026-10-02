import { type Href, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { foodMatchesQuery, type UserFood } from "@savorly/shared";
import { ApiRequestError, fetchDiaryDay, listNutritionFoods } from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Field } from "../../../src/components/Field";
import { Screen } from "../../../src/components/Screen";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import { tokens } from "../../../src/theme/tokens";
import { todayIsoDate } from "../../../src/utils/isoDate";

export default function DiaryPickFoodScreen() {
  const params = useLocalSearchParams<{ date?: string; mealId?: string; nutritionRecipeId?: string }>();
  const date = Array.isArray(params.date) ? params.date[0] : params.date ?? todayIsoDate();
  const mealId = Array.isArray(params.mealId) ? params.mealId[0] : params.mealId;
  const nutritionRecipeId = Array.isArray(params.nutritionRecipeId) ? params.nutritionRecipeId[0] : params.nutritionRecipeId;
  const [foods, setFoods] = useState<UserFood[]>([]);
  const [loggedFoodIds, setLoggedFoodIds] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "recipes">("all");
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void listNutritionFoods()
        .then((live) => {
          if (!active) return;
          setFoods(live.foods);
          setError(null);
        })
        .catch((err) => {
          if (!active) return;
          setError(err instanceof ApiRequestError ? err.message : "Could not load foods.");
        });
      if (mealId) {
        void fetchDiaryDay(date)
          .then((day) => {
            if (!active) return;
            const meal = day.meals.find((row) => row.id === mealId);
            const ids = new Set((meal?.entries ?? []).flatMap((entry) => (entry.foodId ? [entry.foodId] : [])));
            setLoggedFoodIds(ids);
          })
          .catch(() => {
            if (active) setLoggedFoodIds(new Set());
          });
      }
      return () => {
        active = false;
      };
    }, [date, mealId]),
  );

  useEffect(() => {
    const term = query.trim();
    if (!term) return;
    const handle = setTimeout(() => {
      void listNutritionFoods(term)
        .then((live) => {
          setFoods((current) => {
            const byId = new Map(current.map((food) => [food.id, food]));
            for (const food of live.foods) byId.set(food.id, food);
            return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
          });
        })
        .catch(() => undefined);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  const searched = foods.filter((food) => foodMatchesQuery(food, query));
  const visible = tab === "recipes" ? searched.filter((food) => food.source === "recipe") : searched;

  function onPick(foodId: string) {
    if (nutritionRecipeId) {
      router.navigate({
        pathname: "/(app)/diary/nutrition-recipe/[id]",
        params: { id: nutritionRecipeId, addFoodId: foodId },
      });
      return;
    }
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
      <View style={styles.header}>
        <AppText variant="display" style={styles.title}>
          Pick food
        </AppText>
        <Button label="Diary" size="compact" variant="secondary" onPress={() => router.back()} />
      </View>
      <AppText variant="body" color="muted">
        {nutritionRecipeId ? "Choose a food to add to this recipe." : "Choose a food to log in this meal group."}
      </AppText>
      <Field label="Search foods" value={query} onChangeText={setQuery} variant="search" />
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: "all", label: "All foods" },
          { value: "recipes", label: "My recipes" },
        ]}
      />
      {foods.length === 0 ? (
        <AppText variant="body" color="muted">
          Add foods you actually eat first.
        </AppText>
      ) : null}
      {foods.length > 0 && visible.length === 0 ? (
        <AppText variant="body" color="muted">
          Nothing in this list matches.
        </AppText>
      ) : null}
      {visible.map((food) => {
        const logged = loggedFoodIds.has(food.id);
        const recipe = food.source === "recipe";
        return (
          <Pressable
            key={food.id}
            onPress={() => onPick(food.id)}
            style={[styles.food, logged && styles.foodLogged]}
            accessibilityRole="button"
            accessibilityLabel={logged ? `${food.name}, already in this meal` : food.name}
          >
            <AppText variant="title" color={logged ? "accent" : "text"}>
              {food.name}
            </AppText>
            <AppText variant="caption" color={logged ? "accent" : "muted"}>
              {logged ? "In this meal" : recipe ? "Recipe" : `${food.per100g.kcal} kcal / 100 g`}
            </AppText>
          </Pressable>
        );
      })}
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.sm,
  },
  title: {
    flex: 1,
  },
  food: {
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.surface,
    gap: tokens.space.xs,
  },
  foodLogged: {
    backgroundColor: tokens.accentMuted,
    borderColor: tokens.accent,
  },
});
