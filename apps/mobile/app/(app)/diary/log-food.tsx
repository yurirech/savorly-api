import { type Href, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  hasExtendedNutrients,
  listPresentNutrients,
  scaleNutrition,
  type NutrientVector,
  type UserFood,
} from "@savorly/shared";
import {
  ApiRequestError,
  addDiaryEntry,
  deleteDiaryEntry,
  fetchDiaryDay,
  fetchFrequentGrams,
  fetchNutritionFood,
  updateDiaryEntry,
} from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Field } from "../../../src/components/Field";
import NutrientDetailList from "../../../src/components/NutrientDetailList";
import { Screen } from "../../../src/components/Screen";
import { writeLastDiaryMeal } from "../../../src/diary/lastDiaryMealStorage";
import { tokens } from "../../../src/theme/tokens";
import { todayIsoDate } from "../../../src/utils/isoDate";

function parseGrams(value: string): number | null {
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function sourceLabel(source: UserFood["source"]): string {
  if (source === "nevo") return "NEVO";
  if (source === "usda") return "USDA";
  return "Manual";
}

export default function DiaryLogFoodScreen() {
  const params = useLocalSearchParams<{
    date?: string;
    mealId?: string;
    foodId?: string;
    entryId?: string;
  }>();
  const date = Array.isArray(params.date) ? params.date[0] : params.date ?? todayIsoDate();
  const mealId = Array.isArray(params.mealId) ? params.mealId[0] : params.mealId;
  const foodIdParam = Array.isArray(params.foodId) ? params.foodId[0] : params.foodId;
  const entryId = Array.isArray(params.entryId) ? params.entryId[0] : params.entryId;

  const [food, setFood] = useState<UserFood | null>(null);
  const [grams, setGrams] = useState("");
  const [frequentGrams, setFrequentGrams] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(entryId);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        if (!date || !mealId) {
          if (active) setError("Missing diary context.");
          return;
        }
        try {
          if (entryId) {
            const day = await fetchDiaryDay(date);
            const entry = day.meals.flatMap((meal) => meal.entries).find((row) => row.id === entryId);
            if (!entry) {
              if (active) setError("Diary entry not found.");
              return;
            }
            if (entry.kind === "quick") {
              if (active) {
                router.replace({
                  pathname: "/(app)/diary/quick-cal",
                  params: { date, mealId, entryId },
                } as Href);
              }
              return;
            }
            if (!entry.foodId) {
              if (active) setError("Diary entry not found.");
              return;
            }
            if (active) setGrams(String(entry.grams));
            const live = await fetchNutritionFood(entry.foodId);
            const freq = await fetchFrequentGrams(entry.foodId);
            if (active) {
              setFood(live.food);
              setFrequentGrams(freq.grams);
              setError(null);
            }
            return;
          }
          if (!foodIdParam) {
            if (active) setError("Pick a food first.");
            return;
          }
          const live = await fetchNutritionFood(foodIdParam);
          const freq = await fetchFrequentGrams(foodIdParam);
          if (active) {
            setFood(live.food);
            setFrequentGrams(freq.grams);
            if (freq.grams[0] != null) {
              setGrams((current) => (current.trim() ? current : String(freq.grams[0])));
            }
            setError(null);
          }
        } catch (err) {
          if (active) {
            setError(err instanceof ApiRequestError ? err.message : "Could not load food.");
          }
        }
      })();
      return () => {
        active = false;
      };
    }, [date, entryId, foodIdParam, mealId]),
  );

  const scaledPreview = useMemo((): NutrientVector | null => {
    if (!food) return null;
    const amount = parseGrams(grams);
    if (amount == null) return null;
    return scaleNutrition(food.per100g, amount);
  }, [food, grams]);

  const nutrientGroups = useMemo(() => (food ? listPresentNutrients(food.per100g) : []), [food]);

  async function onSave() {
    if (!food || !mealId) return;
    const amount = parseGrams(grams);
    if (amount == null) {
      setError("Enter grams eaten.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (entryId) {
        await updateDiaryEntry(entryId, amount);
      } else {
        await addDiaryEntry(mealId, food.id, amount, date);
        const day = await fetchDiaryDay(date);
        const meal = day.meals.find((row) => row.id === mealId);
        if (meal) {
          await writeLastDiaryMeal({ mealId: meal.id, mealName: meal.name, date });
        }
      }
      router.back();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not save entry.");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteEntry() {
    if (!entryId) return;
    setSaving(true);
    setError(null);
    try {
      await deleteDiaryEntry(entryId);
      router.back();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not delete entry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <AppText variant="display">{isEdit ? "Edit entry" : "Log food"}</AppText>
      {food ? (
        <>
          <AppText variant="title">{food.name}</AppText>
          <AppText variant="caption" color="muted">
            {sourceLabel(food.source)} · {date}
          </AppText>
          <Field label="Grams" value={grams} onChangeText={setGrams} keyboardType="numeric" placeholder="100" />
          {scaledPreview ? (
            <AppText variant="caption" color="muted">
              {scaledPreview.kcal} kcal · {scaledPreview.proteinG}g protein · {scaledPreview.carbsG}g carbs ·{" "}
              {scaledPreview.fatG}g fat
            </AppText>
          ) : null}
          {frequentGrams.length > 0 ? (
            <View style={styles.quickRow}>
              <AppText variant="label" color="muted">
                Often logged
              </AppText>
              <View style={styles.chips}>
                {frequentGrams.map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setGrams(String(value))}
                    style={styles.chip}
                    accessibilityRole="button"
                    accessibilityLabel={`${value} grams`}
                  >
                    <AppText variant="caption">{value} g</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          <AppText variant="title">Per 100 g</AppText>
          <View style={styles.macros}>
            <MacroCell label="kcal" value={food.per100g.kcal} />
            <MacroCell label="Protein" value={`${food.per100g.proteinG} g`} />
            <MacroCell label="Carbs" value={`${food.per100g.carbsG} g`} />
            <MacroCell label="Fat" value={`${food.per100g.fatG} g`} />
          </View>
          {nutrientGroups.length > 0 ? <NutrientDetailList groups={nutrientGroups} /> : null}
          {food.source === "nevo" && !hasExtendedNutrients(food.per100g) ? (
            <AppText variant="caption" color="muted">
              Full NEVO nutrients appear after re-importing this food.
            </AppText>
          ) : null}
          <Button label={isEdit ? "Update entry" : "Add to meal"} onPress={() => void onSave()} loading={saving} />
          {isEdit ? (
            <Button label="Delete entry" variant="secondary" onPress={() => void onDeleteEntry()} loading={saving} />
          ) : null}
        </>
      ) : null}
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}

type MacroCellProps = {
  label: string;
  value: string | number;
};

function MacroCell(props: MacroCellProps) {
  const { label, value } = props;
  return (
    <View style={styles.macro}>
      <AppText variant="caption" color="muted">
        {label}
      </AppText>
      <AppText variant="title">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  quickRow: {
    gap: tokens.space.sm,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.xs,
  },
  macros: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.md,
  },
  macro: {
    flexGrow: 1,
    minWidth: "40%",
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border,
    padding: tokens.space.md,
    gap: tokens.space.xs,
  },
});
