import { type Href, router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { useCallback, useMemo, useState } from "react";

import { Pressable, StyleSheet, View } from "react-native";

import {

  hasExtendedNutrients,

  listPresentNutrients,

  NEVO_ATTRIBUTION,

  scaleNutrition,

  type DiaryMealGroup,

  type NutrientVector,

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

} from "../../../../src/api/client";

import { AppText } from "../../../../src/components/AppText";

import { Button } from "../../../../src/components/Button";

import { Field } from "../../../../src/components/Field";

import NutrientDetailList from "../../../../src/components/NutrientDetailList";

import { Screen } from "../../../../src/components/Screen";

import { clearCachedFood, getCachedFood } from "../../../../src/diary/foodDetailCache";

import DiaryMealNameSheet from "../../../../src/diary/DiaryMealNameSheet";

import DiaryMealPickerSheet from "../../../../src/diary/DiaryMealPickerSheet";

import { resolveMealForDate, writeLastDiaryMeal } from "../../../../src/diary/lastDiaryMealStorage";

import { tokens } from "../../../../src/theme/tokens";

import { todayIsoDate } from "../../../../src/utils/isoDate";



function parseGrams(value: string): number | null {

  const amount = Number(value.replace(",", "."));

  return Number.isFinite(amount) && amount > 0 ? amount : null;

}



function sourceLabel(source: UserFood["source"]): string {

  if (source === "nevo") return "NEVO";

  if (source === "usda") return "USDA";

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

  const [grams, setGrams] = useState("");

  const [frequentGrams, setFrequentGrams] = useState<number[]>([]);

  const [defaultMeal, setDefaultMeal] = useState<{ id: string; name: string } | null>(null);

  const [logging, setLogging] = useState(false);



  const logDate = todayIsoDate();



  const nutrientGroups = useMemo(

    () => (food ? listPresentNutrients(food.per100g) : []),

    [food],

  );



  const scaledPreview = useMemo((): NutrientVector | null => {

    if (!food) return null;

    const amount = parseGrams(grams);

    if (amount == null) return null;

    return scaleNutrition(food.per100g, amount);

  }, [food, grams]);



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



  async function onQuickLog() {

    if (!food) return;

    const amount = parseGrams(grams);

    if (amount == null) {

      setError("Enter grams eaten.");

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

        setError(null);

      }



      void (async () => {

        try {

          const live = await fetchNutritionFood(id);

          setFood(live.food);

          setAttribution(live.attribution);

          setError(null);

          return;

        } catch {

          if (cached) {

            setError(null);

            return;

          }



          try {

            const fromList = await loadFoodFromList(id);

            if (fromList) {

              setFood(fromList);

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

          <AppText variant="caption" color="muted">

            {sourceLabel(food.source)}

            {food.nevoCode != null ? ` · NEVO ${food.nevoCode}` : ""}

            {food.fdcId != null ? ` · FDC ${food.fdcId}` : ""}

          </AppText>



          <View style={styles.quickLog}>

            <AppText variant="title">Quick log</AppText>

            <Field label="Grams" value={grams} onChangeText={setGrams} keyboardType="numeric" placeholder="100" />

            {scaledPreview ? (

              <AppText variant="caption" color="muted">

                {scaledPreview.kcal} kcal · {scaledPreview.proteinG}g protein · {scaledPreview.carbsG}g carbs ·{" "}

                {scaledPreview.fatG}g fat

              </AppText>

            ) : null}

            {frequentGrams.length > 0 ? (

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

            ) : null}

            <Button

              label={defaultMeal ? quickLogLabel : "Choose meal group to log"}

              onPress={() => void (defaultMeal ? onQuickLog() : openLogFlow())}

              loading={logging}

            />

            {defaultMeal ? (

              <Button label="Choose meal…" variant="ghost" onPress={() => void openLogFlow()} />

            ) : null}

          </View>



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

          <Button label="Delete" variant="secondary" onPress={() => void onDelete()} loading={deleting} />

        </>

      ) : null}

      <DiaryMealPickerSheet

        visible={mealPickerVisible}

        meals={todayMeals}

        onClose={() => setMealPickerVisible(false)}

        onSelectMeal={(mealId) => {

          const amount = parseGrams(grams);

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


