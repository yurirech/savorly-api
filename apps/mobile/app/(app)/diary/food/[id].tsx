import { type Href, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  hasExtendedNutrients,
  listPresentNutrients,
  NEVO_ATTRIBUTION,
  resolveFoodGrams,
  scaleNutrition,
  type DiaryMealGroup,
  type FoodAmountUnit,
  type UserFood,
} from "@savorly/shared";
import {
  ApiRequestError,
  addDiaryEntry,
  createDiaryMeal,
  fetchDiaryDay,
  fetchFrequentGrams,
  fetchNutritionFood,
  listNutritionFoods,
  patchNutritionFood,
  renameNutritionFood,
  updateDiaryEntry,
} from "../../../../src/api/client";
import { AppText } from "../../../../src/components/AppText";
import { Button } from "../../../../src/components/Button";
import { Field } from "../../../../src/components/Field";
import NutrientDetailList from "../../../../src/components/NutrientDetailList";
import { Screen } from "../../../../src/components/Screen";
import DiaryMealNameSheet from "../../../../src/diary/DiaryMealNameSheet";
import DiaryMealPickerSheet from "../../../../src/diary/DiaryMealPickerSheet";
import FoodAmountFields, { parseFoodAmount } from "../../../../src/diary/FoodAmountFields";
import { getCachedFood } from "../../../../src/diary/foodDetailCache";
import { resolveMealForDate, writeLastDiaryMeal } from "../../../../src/diary/lastDiaryMealStorage";
import MealStaplesSection from "../../../../src/diary/MealStaplesSection";
import { tokens } from "../../../../src/theme/tokens";
import { todayIsoDate } from "../../../../src/utils/isoDate";

function sourceLabel(source: UserFood["source"]): string {
  if (source === "nevo") return "NEVO";
  if (source === "usda") return "USDA";
  if (source === "recipe") return "Recipe";
  return "Manual";
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function loadFoodFromList(id: string): Promise<UserFood | null> {
  const live = await listNutritionFoods();
  return live.foods.find((item) => item.id === id) ?? null;
}

export default function DiaryFoodDetailScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    date?: string;
    mealId?: string;
    entryId?: string;
    returnTo?: string;
  }>();
  const id = firstParam(params.id);
  const date = firstParam(params.date) ?? todayIsoDate();
  const mealIdParam = firstParam(params.mealId);
  const entryId = firstParam(params.entryId);
  const returnTo = firstParam(params.returnTo);

  const [food, setFood] = useState<UserFood | null>(null);
  const [attribution, setAttribution] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [mealPickerVisible, setMealPickerVisible] = useState(false);
  const [createMealVisible, setCreateMealVisible] = useState(false);
  const [todayMeals, setTodayMeals] = useState<DiaryMealGroup[]>([]);
  const [mealSaving, setMealSaving] = useState(false);
  const [grams, setGrams] = useState("100");
  const [unit, setUnit] = useState<FoodAmountUnit>("grams");
  const [frequentGrams, setFrequentGrams] = useState<number[]>([]);
  const [defaultMeal, setDefaultMeal] = useState<{ id: string; name: string } | null>(null);
  const [logging, setLogging] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [servingDraft, setServingDraft] = useState("");
  const [addingServing, setAddingServing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [savingServing, setSavingServing] = useState(false);
  const insets = useSafeAreaInsets();

  const parsedAmount = parseFoodAmount(grams);
  const amountGrams =
    parsedAmount == null ? null : resolveFoodGrams(unit, parsedAmount, food?.servingWeightG ?? null);
  const previewGrams = amountGrams ?? 100;
  const nameDirty = Boolean(food && nameDraft.trim() && nameDraft.trim() !== food.name);
  const hasServing = food != null && food.servingWeightG != null && food.servingWeightG > 0;

  const scaled = useMemo(
    () => (food ? scaleNutrition(food.per100g, previewGrams) : null),
    [food, previewGrams],
  );

  const nutrientGroups = useMemo(() => (scaled ? listPresentNutrients(scaled) : []), [scaled]);

  const loadDiaryContext = useCallback(async () => {
    if (!food) return;
    try {
      const [day, freq, meal] = await Promise.all([
        fetchDiaryDay(date),
        fetchFrequentGrams(food.id),
        resolveMealForDate(date),
      ]);
      setTodayMeals(day.meals);
      setFrequentGrams(freq.grams);
      const bound = mealIdParam ? (day.meals.find((row) => row.id === mealIdParam) ?? null) : meal;
      setDefaultMeal(bound ? { id: bound.id, name: bound.name } : meal);
      if (entryId) {
        const entry = day.meals.flatMap((row) => row.entries).find((row) => row.id === entryId);
        if (entry && entry.kind !== "quick") {
          setGrams(String(entry.grams));
          setUnit("grams");
        }
      } else if (!grams && freq.grams[0] != null) {
        setGrams(String(freq.grams[0]));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not load today's diary.");
    }
  }, [date, entryId, food, mealIdParam]);

  useFocusEffect(
    useCallback(() => {
      if (food) {
        void loadDiaryContext();
      }
    }, [food, loadDiaryContext]),
  );

  async function openLogFlow() {
    if (!food) return;
    try {
      const day = await fetchDiaryDay(date);
      setTodayMeals(day.meals);
      setMealPickerVisible(true);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not load today's diary.");
    }
  }

  async function rememberMeal(nextMealId: string) {
    const meal = todayMeals.find((row) => row.id === nextMealId);
    if (meal) {
      await writeLastDiaryMeal({ mealId: meal.id, mealName: meal.name, date });
      setDefaultMeal({ id: meal.id, name: meal.name });
    }
  }

  function leaveAfterLog() {
    router.back();
  }

  function resolvedLogGrams(): number | null {
    return parsedAmount == null ? null : resolveFoodGrams(unit, parsedAmount, food?.servingWeightG ?? null);
  }

  async function logToMeal(targetMealId: string) {
    if (!food) return;
    const amount = resolvedLogGrams();
    if (amount == null) {
      setError(unit === "servings" ? "Enter servings eaten." : "Enter grams eaten.");
      return;
    }
    setLogging(true);
    setError(null);
    try {
      if (entryId) {
        await updateDiaryEntry(entryId, amount);
      } else {
        await addDiaryEntry(targetMealId, food.id, amount, date);
        await rememberMeal(targetMealId);
      }
      leaveAfterLog();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not log food.");
    } finally {
      setLogging(false);
    }
  }

  async function onLog() {
    if (!food) return;
    const amount = resolvedLogGrams();
    if (amount == null) {
      setError(unit === "servings" ? "Enter servings eaten." : "Enter grams eaten.");
      return;
    }
    if (entryId) {
      await logToMeal(mealIdParam ?? defaultMeal?.id ?? "");
      return;
    }
    if (mealIdParam) {
      await logToMeal(mealIdParam);
      return;
    }
    if (defaultMeal) {
      await logToMeal(defaultMeal.id);
      return;
    }
    await openLogFlow();
  }

  async function onCreateMealAndLog(name: string) {
    if (!food || !name.trim()) return;
    setMealSaving(true);
    try {
      const day = await createDiaryMeal(date, name);
      const meal = day.meals.find((row) => row.name === name.trim()) ?? day.meals[day.meals.length - 1];
      setCreateMealVisible(false);
      setTodayMeals(day.meals);
      if (meal) {
        await writeLastDiaryMeal({ mealId: meal.id, mealName: meal.name, date });
        setDefaultMeal({ id: meal.id, name: meal.name });
        await logToMeal(meal.id);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not create meal group.");
    } finally {
      setMealSaving(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setError("Food not found.");
        return;
      }

      const cached = getCachedFood(id);
      if (cached) {
        setFood(cached);
        setNameDraft(cached.name);
        setServingDraft(cached.servingWeightG != null ? String(cached.servingWeightG) : "");
        setAddingServing(false);
        setError(null);
      }

      void (async () => {
        try {
          const live = await fetchNutritionFood(id);
          setFood(live.food);
          setNameDraft(live.food.name);
          setServingDraft(live.food.servingWeightG != null ? String(live.food.servingWeightG) : "");
          setAttribution(live.attribution);
          setError(null);
        } catch {
          if (cached) {
            setError(null);
            return;
          }
          try {
            const fromList = await loadFoodFromList(id);
            if (fromList) {
              setFood(fromList);
              setNameDraft(fromList.name);
              setServingDraft(fromList.servingWeightG != null ? String(fromList.servingWeightG) : "");
              setError(null);
              return;
            }
          } catch (listErr) {
            setError(listErr instanceof ApiRequestError ? listErr.message : "Could not load that food.");
            return;
          }
          setError("Food not found.");
        }
      })();
    }, [id]),
  );

  async function onSaveName() {
    if (!food) return;
    const next = nameDraft.trim();
    if (!next || next === food.name) {
      setEditingName(false);
      return;
    }
    setRenaming(true);
    setError(null);
    try {
      const saved = await renameNutritionFood(food.id, next);
      setFood(saved.food);
      setNameDraft(saved.food.name);
      setEditingName(false);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not rename food.");
    } finally {
      setRenaming(false);
    }
  }

  async function onSaveServing() {
    if (!food) return;
    const trimmed = servingDraft.trim();
    const next = trimmed ? Number(trimmed.replace(",", ".")) : null;
    if (!trimmed || !(next != null && next > 0) || next > 5000) {
      setError("Serving weight must be between 0 and 5000 g.");
      return;
    }
    setSavingServing(true);
    setError(null);
    try {
      const saved = await patchNutritionFood(food.id, { servingWeightG: next });
      setFood(saved.food);
      setServingDraft(saved.food.servingWeightG != null ? String(saved.food.servingWeightG) : "");
      setAddingServing(false);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not save serving.");
    } finally {
      setSavingServing(false);
    }
  }

  return (
    <Screen
      overlay={
        food ? (
          <Pressable
            onPress={() => void onLog()}
            disabled={logging}
            style={({ pressed }) => [
              styles.fab,
              { bottom: tokens.space.lg + insets.bottom },
              pressed && styles.fabPressed,
              logging && styles.fabDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="LOG"
          >
            {logging ? (
              <ActivityIndicator color={tokens.bg} />
            ) : (
              <AppText variant="body" style={styles.fabLabel}>
                LOG
              </AppText>
            )}
          </Pressable>
        ) : null
      }
    >
      {food && editingName ? (
        <Field label="Name" value={nameDraft} onChangeText={setNameDraft} />
      ) : (
        <Pressable
          onPress={() => food && setEditingName(true)}
          accessibilityRole="button"
          accessibilityLabel={food ? `Edit ${food.name}` : "Food"}
        >
          <AppText variant="display">{food?.name ?? "Food"}</AppText>
        </Pressable>
      )}
      {food && nameDirty ? (
        <View style={styles.nameActions}>
          <Button size="compact" label="Save" variant="secondary" loading={renaming} onPress={() => void onSaveName()} />
        </View>
      ) : null}

      {food ? <MealStaplesSection foodId={food.id} /> : null}

      {food ? (
        <>
          <AppText variant="caption" color="muted">
            {sourceLabel(food.source)}
            {food.nevoCode != null ? ` · NEVO ${food.nevoCode}` : ""}
            {food.fdcId != null ? ` · FDC ${food.fdcId}` : ""}
            {returnTo === "diary" || entryId ? ` · ${date}` : ""}
          </AppText>

          <FoodAmountFields
            unit={unit}
            amount={grams}
            servingWeightG={food.servingWeightG}
            frequentGrams={frequentGrams}
            onUnitChange={setUnit}
            onAmountChange={setGrams}
          />
          {defaultMeal && !entryId && !mealIdParam ? (
            <View style={styles.actions}>
              <Button size="compact" label="Choose meal…" variant="ghost" onPress={() => void openLogFlow()} />
            </View>
          ) : null}
          {food.nutritionRecipeId ? (
            <View style={styles.actions}>
              <Button
                size="compact"
                label="Edit recipe"
                variant="secondary"
                onPress={() => router.push(`/(app)/diary/nutrition-recipe/${food.nutritionRecipeId}` as Href)}
              />
            </View>
          ) : null}

          <AppText variant="title">{previewGrams} g</AppText>
          <View style={styles.macros}>
            <MacroCell label="kcal" value={scaled?.kcal ?? 0} />
            <MacroCell label="Protein" value={`${scaled?.proteinG ?? 0} g`} />
            <MacroCell label="Carbs" value={`${scaled?.carbsG ?? 0} g`} />
            <MacroCell label="Fat" value={`${scaled?.fatG ?? 0} g`} />
          </View>
          {!hasServing && !addingServing ? (
            <Button size="compact" label="Add serving" variant="secondary" onPress={() => setAddingServing(true)} />
          ) : null}
          {addingServing ? (
            <>
              <Field
                label="Grams per serving"
                value={servingDraft}
                onChangeText={setServingDraft}
                keyboardType="numeric"
                placeholder="e.g. 30"
              />
              <Button size="compact" label="Save serving" variant="secondary" loading={savingServing} onPress={() => void onSaveServing()} />
            </>
          ) : null}
          {nutrientGroups.length > 0 ? <NutrientDetailList groups={nutrientGroups} /> : null}
          {food.source === "nevo" && !hasExtendedNutrients(food.per100g) ? (
            <AppText variant="caption" color="muted">
              Full NEVO nutrients appear after re-importing this food.
            </AppText>
          ) : null}
        </>
      ) : null}

      <DiaryMealPickerSheet
        visible={mealPickerVisible}
        meals={todayMeals}
        onClose={() => setMealPickerVisible(false)}
        onSelectMeal={(nextMealId) => {
          setMealPickerVisible(false);
          void logToMeal(nextMealId);
        }}
        onCreateMeal={() => {
          setMealPickerVisible(false);
          setCreateMealVisible(true);
        }}
      />
      <DiaryMealNameSheet
        visible={createMealVisible}
        title="New meal group"
        confirmLabel="Create and log"
        onClose={() => setCreateMealVisible(false)}
        onConfirm={onCreateMealAndLog}
        loading={mealSaving}
      />
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      {(attribution || food?.source === "nevo") && (
        <AppText variant="caption" color="muted">
          {attribution ?? NEVO_ATTRIBUTION}
        </AppText>
      )}
      {food ? <View style={styles.fabClearance} /> : null}
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
  nameActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.space.sm,
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
  fab: {
    position: "absolute",
    right: tokens.space.lg,
    minHeight: 56,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.accent,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    ...tokens.shadow.card,
  },
  fabPressed: {
    transform: [{ scale: 0.98 }],
  },
  fabDisabled: {
    opacity: 0.45,
  },
  fabLabel: {
    color: tokens.bg,
    fontFamily: tokens.font.bodyBold,
  },
  fabClearance: {
    height: 72,
  },
});
