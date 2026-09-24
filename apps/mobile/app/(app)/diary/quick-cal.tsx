import { type Href, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  ApiRequestError,
  addQuickDiaryEntry,
  deleteDiaryEntry,
  fetchDiaryDay,
  updateQuickDiaryEntry,
} from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Field } from "../../../src/components/Field";
import { Screen } from "../../../src/components/Screen";
import { writeLastDiaryMeal } from "../../../src/diary/lastDiaryMealStorage";
import { tokens } from "../../../src/theme/tokens";
import { todayIsoDate } from "../../../src/utils/isoDate";

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseRequiredKcal(value: string): number | null {
  const parsed = parseOptionalNumber(value);
  if (parsed == null || parsed < 0) {
    return null;
  }
  return parsed;
}

export default function DiaryQuickCalScreen() {
  const params = useLocalSearchParams<{ date?: string; mealId?: string; entryId?: string }>();
  const date = Array.isArray(params.date) ? params.date[0] : params.date ?? todayIsoDate();
  const mealId = Array.isArray(params.mealId) ? params.mealId[0] : params.mealId;
  const entryId = Array.isArray(params.entryId) ? params.entryId[0] : params.entryId;
  const isEdit = Boolean(entryId);

  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!entryId) {
        return;
      }
      let active = true;
      void (async () => {
        try {
          const day = await fetchDiaryDay(date);
          const entry = day.meals.flatMap((meal) => meal.entries).find((row) => row.id === entryId);
          if (!entry || entry.kind !== "quick") {
            if (active) {
              setError("Quick entry not found.");
            }
            return;
          }
          if (active) {
            setName(entry.label ?? entry.foodName);
            setKcal(String(entry.nutrients.kcal));
            setProtein(entry.nutrients.proteinG ? String(entry.nutrients.proteinG) : "");
            setCarbs(entry.nutrients.carbsG ? String(entry.nutrients.carbsG) : "");
            setFat(entry.nutrients.fatG ? String(entry.nutrients.fatG) : "");
            setError(null);
          }
        } catch (err) {
          if (active) {
            setError(err instanceof ApiRequestError ? err.message : "Could not load entry.");
          }
        }
      })();
      return () => {
        active = false;
      };
    }, [date, entryId]),
  );

  const helperCopy = useMemo(
    () =>
      isEdit
        ? "Adjust calories and macros for this diary-only entry."
        : "Log calories once without adding a food to My foods.",
    [isEdit],
  );

  async function onSave() {
    if (!mealId && !isEdit) {
      setError("Pick a meal group first.");
      return;
    }
    const kcalValue = parseRequiredKcal(kcal);
    if (kcalValue == null) {
      setError("Enter calories (zero or more).");
      return;
    }
    const proteinG = parseOptionalNumber(protein);
    const carbsG = parseOptionalNumber(carbs);
    const fatG = parseOptionalNumber(fat);
    if ([protein, carbs, fat].some((field) => field.trim() && parseOptionalNumber(field) == null)) {
      setError("Macros must be valid numbers.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        label: name.trim() || undefined,
        kcal: kcalValue,
        proteinG,
        carbsG,
        fatG,
      };
      if (entryId) {
        await updateQuickDiaryEntry(entryId, payload);
      } else if (mealId) {
        const day = await addQuickDiaryEntry({ mealId, date, ...payload });
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
    if (!entryId) {
      return;
    }
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
      <AppText variant="display">{isEdit ? "Edit quick calories" : "Quick calories"}</AppText>
      <AppText variant="body" color="muted">
        {helperCopy}
      </AppText>
      <Field label="Name (optional)" value={name} onChangeText={setName} placeholder="Office lunch" />
      <Field label="Calories" value={kcal} onChangeText={setKcal} keyboardType="numeric" placeholder="450" />
      <Field label="Protein g (optional)" value={protein} onChangeText={setProtein} keyboardType="numeric" />
      <Field label="Carbs g (optional)" value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
      <Field label="Fat g (optional)" value={fat} onChangeText={setFat} keyboardType="numeric" />
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      <Button label={isEdit ? "Update entry" : "Add to meal"} onPress={() => void onSave()} loading={saving} />
      {isEdit ? (
        <Button label="Delete entry" variant="secondary" onPress={() => void onDeleteEntry()} loading={saving} />
      ) : null}
    </Screen>
  );
}
