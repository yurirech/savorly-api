import { type Href, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
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
  deleteNutritionFood,
  fetchDiaryDay,
  fetchFrequentGrams,
  fetchNutritionFood,
  listNutritionFoods,
  patchNutritionFood,
  renameNutritionFood,
} from "../../../../src/api/client";
import { AppText } from "../../../../src/components/AppText";
import { Button } from "../../../../src/components/Button";
import { Field } from "../../../../src/components/Field";
import NutrientDetailList from "../../../../src/components/NutrientDetailList";
import { Screen } from "../../../../src/components/Screen";
import DiaryMealNameSheet from "../../../../src/diary/DiaryMealNameSheet";
import DiaryMealPickerSheet from "../../../../src/diary/DiaryMealPickerSheet";
import FoodAmountFields, { parseFoodAmount } from "../../../../src/diary/FoodAmountFields";
import { clearCachedFood, getCachedFood } from "../../../../src/diary/foodDetailCache";
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

async function loadFoodFromList(id: string): Promise<UserFood | null> {
  const live = await listNutritionFoods();
  return live.foods.find((item) => item.id === id) ?? null;
}

export default function DiaryFoodDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [food, setFood] = useState<UserFood | null>(null);
  const [attribution, setAttribution] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
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
  const [servingDraft, setServingDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [savingServing, setSavingServing] = useState(false);

  const logDate = todayIsoDate();
  const parsedAmount = parseFoodAmount(grams);
  const amountGrams =
    parsedAmount == null ? null : resolveFoodGrams(unit, parsedAmount, food?.servingWeightG ?? null);
  const previewGrams = amountGrams ?? 100;

  const scaled = useMemo(
    () => (food ? scaleNutrition(food.per100g, previewGrams) : null),
    [food, previewGrams],
  );

  const nutrientGroups = useMemo(() => (scaled ? listPresentNutrients(scaled) : []), [scaled]);

  const loadDiaryContext = useCallback(async () => {
    if (!food) return;
    try {
      const [day, freq, meal] = await Promise.all([
        fetchDiaryDay(logDate),
        fetchFrequentGrams(food.id),
        resolveMealForDate(logDate),
      ]);
      setTodayMeals(day.meals);
      setFrequentGrams(freq.grams);
      setDefaultMeal(meal);
      if (!grams && freq.grams[0] != null) {
        setGrams(String(freq.grams[0]));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not load today's diary.");
    }
  }, [food, logDate]);

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
      const day = await fetchDiaryDay(logDate);
      setTodayMeals(day.meals);
      setMealPickerVisible(true);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not load today's diary.");
    }
  }

  async function rememberMeal(mealId: string) {
    const meal = todayMeals.find((row) => row.id === mealId);
    if (meal) {
      await writeLastDiaryMeal({ mealId: meal.id, mealName: meal.name, date: logDate });
      setDefaultMeal({ id: meal.id, name: meal.name });
    }
  }

  function goLogFood(mealId: string) {
    if (!food) return;
    setMealPickerVisible(false);
    void rememberMeal(mealId);
    router.push({
      pathname: "/(app)/diary/log-food",
      params: { date: logDate, mealId, foodId: food.id },
    } as Href);
  }

  function resolvedLogGrams(): number | null {
    return parsedAmount == null ? null : resolveFoodGrams(unit, parsedAmount, food?.servingWeightG ?? null);
  }

  async function onQuickLog() {
    if (!food) return;
    const amount = resolvedLogGrams();
    if (amount == null) {
      setError(unit === "servings" ? "Enter servings eaten." : "Enter grams eaten.");
      return;
    }
    if (!defaultMeal) {
      await openLogFlow();
      return;
    }
    setLogging(true);
    setError(null);
    try {
      await addDiaryEntry(defaultMeal.id, food.id, amount, logDate);
      await writeLastDiaryMeal({ mealId: defaultMeal.id, mealName: defaultMeal.name, date: logDate });
      router.back();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not log food.");
    } finally {
      setLogging(false);
    }
  }

  async function onCreateMealAndLog(name: string) {
    if (!food || !name.trim()) return;
    setMealSaving(true);
    try {
      const day = await createDiaryMeal(logDate, name);
      const meal = day.meals[day.meals.length - 1];
      setCreateMealVisible(false);
      setTodayMeals(day.meals);
      if (meal) {
        await writeLastDiaryMeal({ mealId: meal.id, mealName: meal.name, date: logDate });
        setDefaultMeal({ id: meal.id, name: meal.name });
        goLogFood(meal.id);
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

  async function onDelete() {
    if (!food) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteNutritionFood(food.id);
      clearCachedFood(food.id);
      router.back();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not delete that food.");
    } finally {
      setDeleting(false);
    }
  }

  const quickLogLabel = defaultMeal ? `Log to ${defaultMeal.name}` : "Choose meal group";

  return (
    <Screen>
      <AppText variant="display">{food?.name ?? "Food"}</AppText>
      {food ? (
        <>
          <Field label="Name" value={nameDraft} onChangeText={setNameDraft} />
          <Button
            size="compact"
            label="Save name"
            variant="secondary"
            loading={renaming}
            onPress={() => {
              void (async () => {
                const next = nameDraft.trim();
                if (!next || next === food.name) return;
                setRenaming(true);
                setError(null);
                try {
                  const saved = await renameNutritionFood(food.id, next);
                  setFood(saved.food);
                  setNameDraft(saved.food.name);
                } catch (err) {
                  setError(err instanceof ApiRequestError ? err.message : "Could not rename food.");
                } finally {
                  setRenaming(false);
                }
              })();
            }}
          />
          <Field
            label="Grams per serving"
            value={servingDraft}
            onChangeText={setServingDraft}
            keyboardType="numeric"
            placeholder="Optional"
          />
          <Button
            size="compact"
            label="Save serving"
            variant="secondary"
            loading={savingServing}
            onPress={() => {
              void (async () => {
                const trimmed = servingDraft.trim();
                const next = trimmed ? Number(trimmed.replace(",", ".")) : null;
                if (trimmed && (!(next != null && next > 0) || next > 5000)) {
                  setError("Serving weight must be between 0 and 5000 g.");
                  return;
                }
                setSavingServing(true);
                setError(null);
                try {
                  const saved = await patchNutritionFood(food.id, { servingWeightG: next });
                  setFood(saved.food);
                  setServingDraft(saved.food.servingWeightG != null ? String(saved.food.servingWeightG) : "");
                } catch (err) {
                  setError(err instanceof ApiRequestError ? err.message : "Could not save serving.");
                } finally {
                  setSavingServing(false);
                }
              })();
            }}
          />
        </>
      ) : null}

      {food ? <MealStaplesSection foodId={food.id} /> : null}

      {food ? (
        <>
          <AppText variant="caption" color="muted">
            {sourceLabel(food.source)}
            {food.nevoCode != null ? ` · NEVO ${food.nevoCode}` : ""}
            {food.fdcId != null ? ` · FDC ${food.fdcId}` : ""}
          </AppText>

          <View style={styles.quickLog}>
            <AppText variant="title">Quick log</AppText>
            <FoodAmountFields
              unit={unit}
              amount={grams}
              servingWeightG={food.servingWeightG}
              frequentGrams={frequentGrams}
              onUnitChange={setUnit}
              onAmountChange={setGrams}
            />
            <View style={styles.actions}>
              <Button
                size="compact"
                label={defaultMeal ? quickLogLabel : "Choose meal group to log"}
                onPress={() => void (defaultMeal ? onQuickLog() : openLogFlow())}
                loading={logging}
              />
              {defaultMeal ? (
                <Button size="compact" label="Choose meal…" variant="ghost" onPress={() => void openLogFlow()} />
              ) : null}
              <Button size="compact" label="Delete" variant="secondary" onPress={() => void onDelete()} loading={deleting} />
              {food.nutritionRecipeId ? (
                <Button
                  size="compact"
                  label="Edit recipe"
                  variant="secondary"
                  onPress={() => router.push(`/(app)/diary/nutrition-recipe/${food.nutritionRecipeId}` as Href)}
                />
              ) : null}
            </View>
          </View>

          <AppText variant="title">{previewGrams} g</AppText>
          <View style={styles.macros}>
            <MacroCell label="kcal" value={scaled?.kcal ?? 0} />
            <MacroCell label="Protein" value={`${scaled?.proteinG ?? 0} g`} />
            <MacroCell label="Carbs" value={`${scaled?.carbsG ?? 0} g`} />
            <MacroCell label="Fat" value={`${scaled?.fatG ?? 0} g`} />
          </View>
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
        onSelectMeal={(mealId) => {
          const amount = resolvedLogGrams();
          if (amount == null) {
            goLogFood(mealId);
            return;
          }
          void (async () => {
            if (!food) return;
            setLogging(true);
            setError(null);
            try {
              await addDiaryEntry(mealId, food.id, amount, logDate);
              await rememberMeal(mealId);
              setMealPickerVisible(false);
              router.back();
            } catch (err) {
              setError(err instanceof ApiRequestError ? err.message : "Could not log food.");
            } finally {
              setLogging(false);
            }
          })();
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
  quickLog: {
    gap: tokens.space.sm,
    padding: tokens.space.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.surface,
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
});
