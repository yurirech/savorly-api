import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { UserFood } from "@savorly/shared";
import { ApiRequestError, addDiaryEntry, listNutritionFoods } from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Field } from "../../../src/components/Field";
import { Screen } from "../../../src/components/Screen";
import { tokens } from "../../../src/theme/tokens";
import { todayIsoDate } from "../../../src/utils/isoDate";

export default function DiaryLogScreen() {
  const params = useLocalSearchParams<{ date?: string; foodId?: string }>();
  const date = Array.isArray(params.date) ? params.date[0] : params.date ?? todayIsoDate();
  const foodId = Array.isArray(params.foodId) ? params.foodId[0] : params.foodId;
  const [foods, setFoods] = useState<UserFood[]>([]);
  const [selected, setSelected] = useState<UserFood | null>(null);
  const [grams, setGrams] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void listNutritionFoods()
        .then((live) => {
          setFoods(live.foods);
          if (foodId) {
            setSelected(live.foods.find((food) => food.id === foodId) ?? null);
          }
        })
        .catch((err) => {
          setError(err instanceof ApiRequestError ? err.message : "Could not load foods.");
        });
    }, [foodId]),
  );

  async function onLog() {
    const amount = Number(grams.replace(",", "."));
    if (!selected) {
      setError("Pick a food first.");
      return;
    }
    if (!(amount > 0)) {
      setError("Enter grams eaten.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addDiaryEntry(selected.id, amount, date);
      router.back();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not log food.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <AppText variant="display">Log food</AppText>
      <AppText variant="body" color="muted">
        {date}. Amount is grams. 12 g of peanut butter is 12% of the 100 g row.
      </AppText>
      {foods.length === 0 ? (
        <AppText variant="body" color="muted">
          Add foods you actually eat first.
        </AppText>
      ) : null}
      {foods.map((food) => {
        const active = selected?.id === food.id;
        return (
          <Pressable
            key={food.id}
            onPress={() => setSelected(food)}
            style={[styles.food, active && styles.foodActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={food.name}
          >
            <AppText variant="title">{food.name}</AppText>
            <AppText variant="caption" color="muted">
              {food.per100g.kcal} kcal / 100 g
            </AppText>
          </Pressable>
        );
      })}
      <Field label="Grams" value={grams} onChangeText={setGrams} keyboardType="numeric" placeholder="12" />
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      <Button label="Add to diary" onPress={() => void onLog()} loading={saving} disabled={!selected} />
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
  foodActive: {
    borderColor: tokens.accent,
  },
});
