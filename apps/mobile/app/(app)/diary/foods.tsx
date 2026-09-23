import { type Href, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { UserFood } from "@savorly/shared";
import { ApiRequestError, listNutritionFoods } from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Field } from "../../../src/components/Field";
import { Screen } from "../../../src/components/Screen";
import { tokens } from "../../../src/theme/tokens";
import { setCachedFood } from "../../../src/diary/foodDetailCache";

export default function DiaryFoodsScreen() {
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<UserFood[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (value: string) => {
    try {
      const live = await listNutritionFoods(value);
      setFoods(live.foods);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not load foods.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load("");
    }, [load]),
  );

  const visible = query.trim()
    ? foods.filter((food) => food.name.toLowerCase().includes(query.trim().toLowerCase()))
    : foods;

  return (
    <Screen>
      <AppText variant="display">My foods</AppText>
      <AppText variant="body" color="muted">
        A short list of what you actually eat. Search NEVO for Dutch generics, USDA for US staples, or type a label yourself.
      </AppText>
      <Field label="Search my foods" value={query} onChangeText={setQuery} variant="search" />
      <Button label="Search NEVO" onPress={() => router.push("/(app)/diary/nevo-search" as Href)} />
      <Button label="Search USDA" variant="secondary" onPress={() => router.push("/(app)/diary/usda-search" as Href)} />
      <Button label="Add manually" variant="secondary" onPress={() => router.push("/(app)/diary/food-form" as Href)} />
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      {visible.length === 0 ? (
        <AppText variant="body" color="muted">
          Nothing saved yet. Import skim milk or add peanut butter by hand.
        </AppText>
      ) : null}
      {visible.map((food) => (
        <Pressable
          key={food.id}
          style={styles.row}
          onPress={() => {
            setCachedFood(food);
            router.push(`/(app)/diary/food/${food.id}` as Href);
          }}
          accessibilityRole="button"
          accessibilityLabel={food.name}
        >
          <View style={styles.copy}>
            <AppText variant="title">{food.name}</AppText>
            <AppText variant="caption" color="muted">
              {food.per100g.kcal} kcal / 100 g ·{" "}
              {food.source === "nevo" ? "NEVO" : food.source === "usda" ? "USDA" : "Manual"}
            </AppText>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  },
  copy: {
    flex: 1,
    gap: tokens.space.xs,
  },
});
