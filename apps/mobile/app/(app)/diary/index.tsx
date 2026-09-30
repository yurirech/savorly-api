import { type Href, router, useFocusEffect, useSegments } from "expo-router";
import { CaretLeft, CaretRight, ChartPie } from "phosphor-react-native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { hasExtendedNutrients, listPresentNutrients, type DiaryDayResponse, type NutritionSex } from "@savorly/shared";
import type { DiaryEntry } from "@savorly/shared";
import {
  ApiRequestError,
  copyDiaryEntries,
  copyPreviousDiaryMeal,
  createDiaryMeal,
  createNutritionRecipe,
  createNutritionRecipeFromText,
  deleteDiaryEntry,
  deleteDiaryMeal,
  fetchDiaryDay,
  logMealStaples,
  fetchNutritionProfile,
  updateDiaryMeal,
} from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import NutrientDetailList from "../../../src/components/NutrientDetailList";
import { Screen } from "../../../src/components/Screen";
import DiaryConfirmSheet from "../../../src/diary/DiaryConfirmSheet";
import RemainingBanner from "../../../src/diary/RemainingBanner";
import DiaryDayNutrition from "../../../src/diary/DiaryDayNutrition";
import DiaryMealNameSheet from "../../../src/diary/DiaryMealNameSheet";
import DiaryMealPickerSheet from "../../../src/diary/DiaryMealPickerSheet";
import DiaryMealSection from "../../../src/diary/DiaryMealSection";
import { writeLastDiaryMeal } from "../../../src/diary/lastDiaryMealStorage";
import { tokens } from "../../../src/theme/tokens";
import { shiftIsoDate, todayIsoDate } from "../../../src/utils/isoDate";

type NameSheetMode =
  | { kind: "create" }
  | { kind: "create-for-copy" }
  | { kind: "recipe" }
  | { kind: "rename"; mealId: string; initialName: string };

type CopyRequest = { entryIds: string[]; mealId: string };

export default function DiaryScreen() {
  const inTabs = (useSegments() as string[]).includes("(tabs)");
  const [date, setDate] = useState(todayIsoDate);
  const [day, setDay] = useState<DiaryDayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showMicronutrients, setShowMicronutrients] = useState(false);
  const [collapsedMeals, setCollapsedMeals] = useState<Set<string>>(() => new Set());
  const [nameSheet, setNameSheet] = useState<NameSheetMode | null>(null);
  const [nameSaving, setNameSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingEntry, setPendingEntry] = useState<DiaryEntry | null>(null);
  const [entryDeleting, setEntryDeleting] = useState(false);
  const [copyRequest, setCopyRequest] = useState<CopyRequest | null>(null);
  const [copying, setCopying] = useState(false);
  const [sex, setSex] = useState<NutritionSex | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [fillingPaste, setFillingPaste] = useState(false);
  const [fillError, setFillError] = useState<string | null>(null);

  const dayMicroGroups = useMemo(() => (day?.totals ? listPresentNutrients(day.totals) : []), [day?.totals]);

  const load = useCallback(async (nextDate: string, isActive: () => boolean = () => true) => {
    try {
      const [live, profile] = await Promise.all([
        fetchDiaryDay(nextDate),
        fetchNutritionProfile().catch(() => null),
      ]);
      if (isActive()) {
        setDay(live);
        setSex(profile?.profile?.sex ?? null);
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

  async function onFillRecipe() {
    if (pasteText.trim().length < 8) {
      setFillError("Paste a bit more of the recipe.");
      return;
    }
    setFillingPaste(true);
    setFillError(null);
    try {
      const recipe = await createNutritionRecipeFromText(pasteText.trim());
      setNameSheet(null);
      setPasteText("");
      router.push(`/(app)/diary/nutrition-recipe/${recipe.id}` as Href);
    } catch (err) {
      setFillError(err instanceof ApiRequestError ? err.message : "Filling this in needs a connection.");
    } finally {
      setFillingPaste(false);
    }
  }

  async function onConfirmMealName(name: string) {
    if (!nameSheet || !name.trim()) {
      setError(nameSheet?.kind === "recipe" ? "Give the recipe a name." : "Give the meal group a name.");
      return;
    }
    setNameSaving(true);
    setError(null);
    try {
      if (nameSheet.kind === "recipe") {
        const recipe = await createNutritionRecipe(name.trim());
        setNameSheet(null);
        router.push(`/(app)/diary/nutrition-recipe/${recipe.id}` as Href);
        return;
      }
      if (nameSheet.kind === "create" || nameSheet.kind === "create-for-copy") {
        const live = await createDiaryMeal(date, name);
        const created = live.meals[live.meals.length - 1];
        if (nameSheet.kind === "create-for-copy" && copyRequest && created) {
          setDay(await copyDiaryEntries(copyRequest.entryIds, created.id));
          setCopyRequest(null);
        } else {
          setDay(live);
        }
        if (created) {
          await writeLastDiaryMeal({ mealId: created.id, mealName: created.name, date });
        }
      } else {
        const live = await updateDiaryMeal(nameSheet.mealId, { name });
        setDay(live);
      }
      setNameSheet(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not save.");
    } finally {
      setNameSaving(false);
    }
  }

  async function confirmDeleteMeal() {
    if (!pendingDelete) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const live = await deleteDiaryMeal(pendingDelete.id);
      setDay(live);
      setPendingDelete(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not delete meal group.");
    } finally {
      setDeleting(false);
    }
  }

  async function confirmDeleteEntry() {
    if (!pendingEntry) {
      return;
    }
    setEntryDeleting(true);
    setError(null);
    try {
      setDay(await deleteDiaryEntry(pendingEntry.id));
      setPendingEntry(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not delete that food.");
    } finally {
      setEntryDeleting(false);
    }
  }

  async function copyEntriesToMeal(mealId: string) {
    if (!copyRequest || copying) {
      return;
    }
    setCopying(true);
    setError(null);
    try {
      const live = await copyDiaryEntries(copyRequest.entryIds, mealId);
      setDay(live);
      setCopyRequest(null);
      const meal = live.meals.find((row) => row.id === mealId);
      if (meal) {
        await writeLastDiaryMeal({ mealId: meal.id, mealName: meal.name, date });
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not copy that food.");
    } finally {
      setCopying(false);
    }
  }

  async function fillMeal(action: () => Promise<DiaryDayResponse>) {
    setError(null);
    try {
      setDay(await action());
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not fill this group.");
    }
  }

  function openQuickCal() {
    router.push({
      pathname: "/(app)/diary/quick-cal",
      params: { date },
    } as Href);
  }

  const meals = day?.meals ?? [];
  const remaining = day?.remaining;
  const totals = day?.totals;

  return (
    <Screen
      safeBottom={!inTabs}
      onRefresh={() => void onRefresh()}
      refreshing={refreshing}
      footer={
        <>
          <Button size="compact" label="Add meal group" onPress={() => setNameSheet({ kind: "create" })} />
          <Button size="compact" label="Quick calories" variant="secondary" onPress={openQuickCal} />
          <Button size="compact" label="📝 New recipe" variant="secondary" onPress={() => setNameSheet({ kind: "recipe" })} />
        </>
      }
    >
      <View style={styles.dateRow}>
        <Pressable onPress={() => setDate((current) => shiftIsoDate(current, -1))} accessibilityLabel="Previous day">
          <CaretLeft size={22} color={tokens.text} />
        </Pressable>
        <AppText variant="title">{date}</AppText>
        <Pressable onPress={() => setDate((current) => shiftIsoDate(current, 1))} accessibilityLabel="Next day">
          <CaretRight size={22} color={tokens.text} />
        </Pressable>
      </View>

      <RemainingBanner
        remaining={remaining ?? null}
        totalsKcal={totals?.kcal ?? null}
        targetKcal={day?.targets?.kcal ?? null}
      />

      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}

      <View style={styles.actionRow}>
        <Button size="compact" label="My foods" variant="secondary" onPress={() => router.push("/(app)/diary/foods" as Href)} />
        <Button size="compact" label="Targets" variant="ghost" onPress={() => router.push("/(app)/diary/profile" as Href)} />
        {totals && hasExtendedNutrients(totals) ? (
          <Pressable
            onPress={() => setShowMicronutrients((current) => !current)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showMicronutrients ? "Hide today's micronutrients" : "Show today's micronutrients"}
          >
            <ChartPie size={22} color={showMicronutrients ? tokens.accent : tokens.text} />
          </Pressable>
        ) : null}
      </View>
      {showMicronutrients && totals && hasExtendedNutrients(totals) ? (
        <View style={styles.microSection}>
          <NutrientDetailList groups={dayMicroGroups} />
        </View>
      ) : null}

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
            onDeleteEntry={(entry) => setPendingEntry(entry)}
            onCopyEntry={(entryIds) => setCopyRequest({ entryIds, mealId: meal.id })}
            onCopyPrevious={
              date === todayIsoDate() && meal.canCopyPrevious && meal.entries.length === 0
                ? () => void fillMeal(() => copyPreviousDiaryMeal(meal.id))
                : undefined
            }
            onAddStaples={
              (meal.stapleCount ?? 0) > 0 && meal.entries.length === 0
                ? () => void fillMeal(() => logMealStaples(meal.id))
                : undefined
            }
            onRename={() => setNameSheet({ kind: "rename", mealId: meal.id, initialName: meal.name })}
            onDelete={() => setPendingDelete({ id: meal.id, name: meal.name })}
          />
        ))}
      </View>

      {totals ? <DiaryDayNutrition date={date} totals={totals} targets={day?.targets ?? null} sex={sex} /> : null}

      <DiaryMealNameSheet
        visible={nameSheet != null}
        title={
          nameSheet?.kind === "recipe"
            ? "New recipe"
            : nameSheet?.kind === "rename"
              ? "Rename meal group"
              : "New meal group"
        }
        initialName={nameSheet?.kind === "rename" ? nameSheet.initialName : ""}
        fieldLabel={nameSheet?.kind === "recipe" ? "Recipe name" : undefined}
        placeholder={nameSheet?.kind === "recipe" ? "Oatmeal" : undefined}
        suggestions={nameSheet?.kind === "recipe" ? [] : undefined}
        confirmLabel={
          nameSheet?.kind === "recipe"
            ? "Create"
            : nameSheet?.kind === "create-for-copy"
              ? "Add and copy"
              : nameSheet?.kind === "rename"
                ? "Save name"
                : "Add group"
        }
        onClose={() => {
          setNameSheet(null);
          setPasteText("");
          setFillError(null);
        }}
        onConfirm={onConfirmMealName}
        loading={nameSaving}
        paste={
          nameSheet?.kind === "recipe"
            ? {
                value: pasteText,
                onChangeText: setPasteText,
                onFill: () => void onFillRecipe(),
                filling: fillingPaste,
                error: fillError,
              }
            : undefined
        }
      />
      <DiaryConfirmSheet
        visible={pendingDelete != null}
        title="Delete meal group?"
        message={
          pendingDelete
            ? `Remove "${pendingDelete.name}" and the foods logged in it today. Earlier days keep this group.`
            : ""
        }
        confirmLabel="Delete"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void confirmDeleteMeal()}
        loading={deleting}
      />
      <DiaryConfirmSheet
        visible={pendingEntry != null}
        title="Delete this food?"
        message={pendingEntry ? `Remove ${pendingEntry.foodName} from this meal group.` : ""}
        confirmLabel="Delete"
        onClose={() => setPendingEntry(null)}
        onConfirm={() => void confirmDeleteEntry()}
        loading={entryDeleting}
      />
      <DiaryMealPickerSheet
        visible={copyRequest != null && nameSheet == null}
        title="Copy to which meal?"
        meals={meals.filter((meal) => meal.id !== copyRequest?.mealId)}
        onClose={() => setCopyRequest(null)}
        onSelectMeal={(mealId) => void copyEntriesToMeal(mealId)}
        onCreateMeal={() => setNameSheet({ kind: "create-for-copy" })}
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
  microSection: {
    gap: tokens.space.sm,
  },
  meals: {
    gap: tokens.space.md,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.space.sm,
  },
});
