import { type Href, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { UserFood } from "@savorly/shared";
import { ApiRequestError, importStapleFoods, listNutritionFoods, stapleFoodsStatus } from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Field } from "../../../src/components/Field";
import { Screen } from "../../../src/components/Screen";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import { tokens } from "../../../src/theme/tokens";
import { setCachedFood } from "../../../src/diary/foodDetailCache";

export default function DiaryFoodsScreen() {
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<UserFood[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [staplesImported, setStaplesImported] = useState(false);
  const [importingStaples, setImportingStaples] = useState(false);
  const [tab, setTab] = useState<"all" | "recipes">("all");

  const load = useCallback(async (value: string) => {
    try {
      const [live, staples] = await Promise.all([listNutritionFoods(value), stapleFoodsStatus()]);
      setFoods(live.foods);
      setStaplesImported(staples.imported);
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

  const searched = query.trim()
    ? foods.filter((food) => food.name.toLowerCase().includes(query.trim().toLowerCase()))
    : foods;
  const visible = tab === "recipes" ? searched.filter((food) => food.source === "recipe") : searched;

  function sourceCaption(source: UserFood["source"]): string {
    if (source === "nevo") return "NEVO";
    if (source === "usda") return "USDA";
    if (source === "recipe") return "Recipe";
    return "Manual";
  }

  return (
    <Screen>
      <AppText variant="display">My foods</AppText>
      <AppText variant="body" color="muted">
        A short list of what you actually eat. Search NEVO for Dutch generics, USDA for US staples, or type a label yourself.
      </AppText>
      <Field label="Search my foods" value={query} onChangeText={setQuery} variant="search" />
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: "all", label: "All foods" },
          { value: "recipes", label: "My recipes" },
        ]}
      />
      <View style={styles.actions}>
      {!staplesImported ? (
      <Button size="compact"
        label="Add my staples"
        loading={importingStaples}
        onPress={() => {
          setImportingStaples(true);
          setError(null);
          void importStapleFoods()
            .then(() => load(""))
            .catch((err: unknown) => {
              setError(err instanceof ApiRequestError ? err.message : "Could not add staples.");
            })
            .finally(() => setImportingStaples(false));
        }}
      />
      ) : null}
      <Button size="compact" label="Search NEVO" variant="secondary" onPress={() => router.push("/(app)/diary/nevo-search" as Href)} />
      <Button size="compact" label="Search USDA" variant="secondary" onPress={() => router.push("/(app)/diary/usda-search" as Href)} />
      <Button size="compact" label="Add manually" variant="secondary" onPress={() => router.push("/(app)/diary/food-form" as Href)} />
      </View>
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
            if (food.source === "recipe" && food.nutritionRecipeId) {
              router.push(`/(app)/diary/nutrition-recipe/${food.nutritionRecipeId}` as Href);
              return;
            }
            router.push(`/(app)/diary/food/${food.id}` as Href);
          }}
          accessibilityRole="button"
          accessibilityLabel={food.name}
        >
          <View style={styles.copy}>
            <AppText variant="title">{food.name}</AppText>
            <AppText variant="caption" color="muted">
              {food.per100g.kcal} kcal / 100 g · {sourceCaption(food.source)}
            </AppText>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.space.sm,
  },
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
