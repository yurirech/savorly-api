import { type Href, router, useFocusEffect } from "expo-router";
import { CaretLeft, CaretRight } from "phosphor-react-native";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { hasExtendedNutrients, listPresentNutrients, type DiaryDayResponse } from "@savorly/shared";
import {
  ApiRequestError,
  createDiaryMeal,
  deleteDiaryMeal,
  fetchDiaryDay,
  updateDiaryMeal,
} from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import NutrientDetailList from "../../../src/components/NutrientDetailList";
import { Screen } from "../../../src/components/Screen";
import DiaryMealNameSheet from "../../../src/diary/DiaryMealNameSheet";
import DiaryMealPickerSheet from "../../../src/diary/DiaryMealPickerSheet";
import DiaryMealSection from "../../../src/diary/DiaryMealSection";
import { resolveMealForDate, writeLastDiaryMeal } from "../../../src/diary/lastDiaryMealStorage";
import { tokens } from "../../../src/theme/tokens";
import { shiftIsoDate, todayIsoDate } from "../../../src/utils/isoDate";

type NameSheetMode = { kind: "create" } | { kind: "rename"; mealId: string; initialName: string };

export default function DiaryScreen() {
  const [date, setDate] = useState(todayIsoDate);
  const [day, setDay] = useState<DiaryDayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showMicronutrients, setShowMicronutrients] = useState(false);
  const [collapsedMeals, setCollapsedMeals] = useState<Set<string>>(() => new Set());
  const [nameSheet, setNameSheet] = useState<NameSheetMode | null>(null);
  const [nameSaving, setNameSaving] = useState(false);
  const [quickCalPickerVisible, setQuickCalPickerVisible] = useState(false);

  const dayMicroGroups = useMemo(() => (day?.totals ? listPresentNutrients(day.totals) : []), [day?.totals]);

  const load = useCallback(async (nextDate: string, isActive: () => boolean = () => true) => {
    try {
      const live = await fetchDiaryDay(nextDate);
      if (isActive()) {
        setDay(live);
        setError(null);
      }
    } catch (err) {
      if (isActive()) {
        setError(err instanceof ApiRequestError ? err.message : "Could not load diary.");
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void load(date, () => active);
      return () => {
        active = false;
      };
    }, [date, load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load(date);
    } finally {
      setRefreshing(false);
    }
  }

  function toggleMealCollapsed(mealId: string) {
    setCollapsedMeals((current) => {
      const next = new Set(current);
      if (next.has(mealId)) {
        next.delete(mealId);
      } else {
        next.add(mealId);
      }
      return next;
    });
  }

  async function onConfirmMealName(name: string) {
    if (!nameSheet || !name.trim()) {
      setError("Give the meal group a name.");
      return;
    }
    setNameSaving(true);
    setError(null);
    try {
      if (nameSheet.kind === "create") {
        const live = await createDiaryMeal(date, name);
        setDay(live);
        const created = live.meals[live.meals.length - 1];
        if (created) {
          await writeLastDiaryMeal({ mealId: created.id, mealName: created.name, date });
        }
      } else {
        const live = await updateDiaryMeal(nameSheet.mealId, { name });
        setDay(live);
      }
      setNameSheet(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not save meal group.");
    } finally {
      setNameSaving(false);
    }
  }

  function onDeleteMeal(mealId: string, mealName: string) {
    Alert.alert("Delete meal group?", `Remove "${mealName}" and its logged foods?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              const live = await deleteDiaryMeal(mealId);
              setDay(live);
            } catch (err) {
              setError(err instanceof ApiRequestError ? err.message : "Could not delete meal group.");
            }
          })();
        },
      },
    ]);
  }

  function goQuickCal(mealId: string) {
    router.push({
      pathname: "/(app)/diary/quick-cal",
      params: { date, mealId },
    } as Href);
  }

  async function openQuickCalFromDiary() {
    try {
      const meal = await resolveMealForDate(date);
      if (meal) {
        goQuickCal(meal.id);
        return;
      }
      setQuickCalPickerVisible(true);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not open quick calories.");
    }
  }

  function onSelectMealForQuickCal(mealId: string) {
    setQuickCalPickerVisible(false);
    const meal = meals.find((row) => row.id === mealId);
    if (meal) {
      void writeLastDiaryMeal({ mealId: meal.id, mealName: meal.name, date });
    }
    goQuickCal(mealId);
  }

  const meals = day?.meals ?? [];
  const remaining = day?.remaining;
  const totals = day?.totals;

  return (
    <Screen onRefresh={() => void onRefresh()} refreshing={refreshing}>
      <View style={styles.dateRow}>
        <Pressable onPress={() => setDate((current) => shiftIsoDate(current, -1))} accessibilityLabel="Previous day">
          <CaretLeft size={22} color={tokens.text} />
        </Pressable>
        <AppText variant="title">{date}</AppText>
        <Pressable onPress={() => setDate((current) => shiftIsoDate(current, 1))} accessibilityLabel="Next day">
          <CaretRight size={22} color={tokens.text} />
        </Pressable>
      </View>

      {day?.targets ? (
        <View style={styles.card}>
          <AppText variant="label" color="muted">
            Remaining
          </AppText>
          <AppText variant="display">{remaining ? `${remaining.kcal} kcal` : "—"}</AppText>
          <AppText variant="caption" color="muted">
            {remaining
              ? `${remaining.proteinG}g protein · ${remaining.carbsG}g carbs · ${remaining.fatG}g fat`
              : "Set a profile to see targets."}
          </AppText>
          {totals ? (
            <AppText variant="caption" color="muted">
              Logged {totals.kcal} / {day.targets.kcal} kcal
            </AppText>
          ) : null}
        </View>
      ) : (
        <AppText variant="body" color="muted">
          Set your height, weight, and goal so remaining calories have something to chase.
        </AppText>
      )}

      {totals && hasExtendedNutrients(totals) ? (
        <View style={styles.microSection}>
          <Button
            label={showMicronutrients ? "Hide micronutrients" : "Show today's micronutrients"}
            variant="ghost"
            onPress={() => setShowMicronutrients((current) => !current)}
          />
          {showMicronutrients ? <NutrientDetailList groups={dayMicroGroups} /> : null}
        </View>
      ) : null}

      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}

      <Button label="Add meal group" onPress={() => setNameSheet({ kind: "create" })} />
      <Button label="Quick calories" variant="secondary" onPress={() => void openQuickCalFromDiary()} />
      <Button label="My foods" variant="secondary" onPress={() => router.push("/(app)/diary/foods" as Href)} />
      <Button label="Targets" variant="ghost" onPress={() => router.push("/(app)/diary/profile" as Href)} />

      {day && meals.length === 0 ? (
        <AppText variant="body" color="muted">
          Add a meal group, then log foods with amounts for this day.
        </AppText>
      ) : null}

      <View style={styles.meals}>
        {meals.map((meal) => (
          <DiaryMealSection
            key={meal.id}
            meal={meal}
            collapsed={collapsedMeals.has(meal.id)}
            onToggleCollapse={() => toggleMealCollapsed(meal.id)}
            onPressEntry={(entry) =>
              entry.kind === "quick"
                ? router.push({
                    pathname: "/(app)/diary/quick-cal",
                    params: { date, mealId: meal.id, entryId: entry.id },
                  } as Href)
                : router.push({
                    pathname: "/(app)/diary/log-food",
                    params: { date, mealId: meal.id, entryId: entry.id },
                  } as Href)
            }
            onAddFood={() =>
              router.push({
                pathname: "/(app)/diary/log",
                params: { date, mealId: meal.id },
              } as Href)
            }
            onQuickCal={() => goQuickCal(meal.id)}
            onRename={() => setNameSheet({ kind: "rename", mealId: meal.id, initialName: meal.name })}
            onDelete={() => onDeleteMeal(meal.id, meal.name)}
          />
        ))}
      </View>

      <DiaryMealPickerSheet
        visible={quickCalPickerVisible}
        meals={meals}
        onClose={() => setQuickCalPickerVisible(false)}
        onSelectMeal={onSelectMealForQuickCal}
        onCreateMeal={() => {
          setQuickCalPickerVisible(false);
          setNameSheet({ kind: "create" });
        }}
      />

      <DiaryMealNameSheet
        visible={nameSheet != null}
        title={nameSheet?.kind === "rename" ? "Rename meal group" : "New meal group"}
        initialName={nameSheet?.kind === "rename" ? nameSheet.initialName : ""}
        confirmLabel={nameSheet?.kind === "rename" ? "Save name" : "Add group"}
        onClose={() => setNameSheet(null)}
        onConfirm={onConfirmMealName}
        loading={nameSaving}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border,
    padding: tokens.space.md,
    gap: tokens.space.xs,
  },
  microSection: {
    gap: tokens.space.sm,
  },
  meals: {
    gap: tokens.space.md,
  },
});
