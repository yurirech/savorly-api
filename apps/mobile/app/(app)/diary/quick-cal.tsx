import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { DiaryMealGroup } from "@savorly/shared";
import {
  ApiRequestError,
  addQuickDiaryEntry,
  createDiaryMeal,
  deleteDiaryEntry,
  fetchDiaryDay,
  updateQuickDiaryEntry,
} from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Field } from "../../../src/components/Field";
import { Screen } from "../../../src/components/Screen";
import DiaryMealNameSheet from "../../../src/diary/DiaryMealNameSheet";
import DiaryMealPickerSheet from "../../../src/diary/DiaryMealPickerSheet";
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
  const [pickerVisible, setPickerVisible] = useState(false);
  const [creatingMeal, setCreatingMeal] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [meals, setMeals] = useState<DiaryMealGroup[]>([]);

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

  async function onSave(targetMealId?: string) {
    const chosenMealId = targetMealId ?? mealId;
    if (!chosenMealId && !isEdit) {
      const kcalValue = parseRequiredKcal(kcal);
      if (kcalValue == null) {
        setError("Enter calories (zero or more).");
        return;
      }
      if ([protein, carbs, fat].some((field) => field.trim() && parseOptionalNumber(field) == null)) {
        setError("Macros must be valid numbers.");
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const day = await fetchDiaryDay(date);
        setMeals(day.meals);
        setPickerVisible(true);
      } catch (err) {
        setError(err instanceof ApiRequestError ? err.message : "Could not load meal groups.");
      } finally {
        setSaving(false);
      }
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
      } else if (chosenMealId) {
        const day = await addQuickDiaryEntry({ mealId: chosenMealId, date, ...payload });
        const meal = day.meals.find((row) => row.id === chosenMealId);
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
      <View style={styles.actions}>
        <Button
          size="compact"
          label={isEdit ? "Update entry" : "Choose meal"}
          onPress={() => void onSave()}
          loading={saving}
        />
        {isEdit ? (
          <Button size="compact" label="Delete entry" variant="secondary" onPress={() => void onDeleteEntry()} loading={saving} />
        ) : null}
      </View>
      <DiaryMealPickerSheet
        visible={pickerVisible}
        meals={meals}
        onClose={() => setPickerVisible(false)}
        onSelectMeal={(nextMealId) => {
          setPickerVisible(false);
          void onSave(nextMealId);
        }}
        onCreateMeal={() => {
          setPickerVisible(false);
          setCreatingMeal(true);
        }}
      />
      <DiaryMealNameSheet
        visible={creatingMeal}
        title="New meal group"
        confirmLabel="Add group"
        loading={nameSaving}
        onClose={() => setCreatingMeal(false)}
        onConfirm={(mealName) => {
          void (async () => {
            if (!mealName.trim()) {
              setError("Give the meal group a name.");
              return;
            }
            setNameSaving(true);
            setError(null);
            try {
              const live = await createDiaryMeal(date, mealName.trim());
              const created = live.meals[live.meals.length - 1];
              setCreatingMeal(false);
              if (created) {
                await onSave(created.id);
              }
            } catch (err) {
              setError(err instanceof ApiRequestError ? err.message : "Could not add meal group.");
            } finally {
              setNameSaving(false);
            }
          })();
        }}
      />
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
});
