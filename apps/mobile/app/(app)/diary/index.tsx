import { type Href, router, useFocusEffect, useSegments } from "expo-router";
import { CaretLeft, CaretRight, ChartPie, DotsThreeVertical } from "phosphor-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, View } from "react-native";
import { hasExtendedNutrients, listPresentNutrients, type DiaryDayResponse, type NutritionSex } from "@savorly/shared";
import type { DiaryEntry } from "@savorly/shared";
import {
  addDiaryEntry,
  addQuickDiaryEntry,
  ApiRequestError,
  copyPreviousDiaryMeal,
  createDiaryMeal,
  createNutritionRecipe,
  createNutritionRecipeFromText,
  deleteDiaryEntry,
  deleteDiaryMeal,
  fetchDiaryDay,
  relocateDiaryEntries,
  logMealStaples,
  fetchNutritionProfile,
  setDiaryDayTarget,
  clearDiaryDayTarget,
  updateDiaryMeal,
} from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import ContextMenu, {
  measureContextMenuAnchor,
  type ContextMenuAnchor,
} from "../../../src/components/ContextMenu";
import NutrientDetailList from "../../../src/components/NutrientDetailList";
import { Screen } from "../../../src/components/Screen";
import Skeleton from "../../../src/components/Skeleton";
import Toast from "../../../src/components/Toast";
import DiaryConfirmSheet from "../../../src/diary/DiaryConfirmSheet";
import DiaryDayTargetSheet from "../../../src/diary/DiaryDayTargetSheet";
import RemainingBanner from "../../../src/diary/RemainingBanner";
import DiaryDayNutrition from "../../../src/diary/DiaryDayNutrition";
import DiaryMealNameSheet from "../../../src/diary/DiaryMealNameSheet";
import DiaryMoveSheet from "../../../src/diary/DiaryMoveSheet";
import DiaryMealSection from "../../../src/diary/DiaryMealSection";
import { writeLastDiaryMeal } from "../../../src/diary/lastDiaryMealStorage";
import { tokens } from "../../../src/theme/tokens";
import { shiftIsoDate, todayIsoDate } from "../../../src/utils/isoDate";

type NameSheetMode =
  | { kind: "create" }
  | { kind: "create-for-relocate"; date: string }
  | { kind: "recipe" }
  | { kind: "rename"; mealId: string; initialName: string };

type RelocateRequest = { entryIds: string[] };

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
  const [toast, setToast] = useState<{ message: string; undo?: () => Promise<void> } | null>(null);
  const [relocateRequest, setRelocateRequest] = useState<RelocateRequest | null>(null);
  const [relocating, setRelocating] = useState(false);
  const [relocateError, setRelocateError] = useState<string | null>(null);
  const [createdRelocateMeal, setCreatedRelocateMeal] = useState<{
    date: string;
    mealId: string;
    meals: DiaryDayResponse["meals"];
  } | null>(null);
  const [sex, setSex] = useState<NutritionSex | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [fillingPaste, setFillingPaste] = useState(false);
  const [fillError, setFillError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<ContextMenuAnchor | null>(null);
  const menuButtonRef = useRef<View>(null);
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [selectionDeleting, setSelectionDeleting] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [targetSaving, setTargetSaving] = useState(false);
  const [targetError, setTargetError] = useState<string | null>(null);
  const [profileKcal, setProfileKcal] = useState<number | null>(null);

  const closeDiaryMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuAnchor(null);
  }, []);

  const openDiaryMenu = useCallback(() => {
    measureContextMenuAnchor(menuButtonRef, (anchor) => {
      setMenuAnchor(anchor);
      setMenuOpen(true);
    });
  }, []);

  const dayMicroGroups = useMemo(() => (day?.totals ? listPresentNutrients(day.totals) : []), [day?.totals]);

  const load = useCallback(async (nextDate: string, isActive: () => boolean = () => true) => {
    const { readDay } = await import("../../../src/offline/store");
    const cached = await readDay(nextDate);
    if (!isActive()) return;
    if (cached) {
      setDay(cached);
      setError(null);
    } else {
      setDay(null);
    }
    try {
      const [live, profile] = await Promise.all([
        fetchDiaryDay(nextDate),
        fetchNutritionProfile().catch(() => null),
      ]);
      if (isActive()) {
        setDay(live);
        setSex(profile?.profile?.sex ?? null);
        setProfileKcal(profile?.targets?.kcal ?? null);
        setError(null);
      }
    } catch {
      if (!isActive()) return;
      if (cached) {
        setError(null);
        return;
      }
      setError("No day saved on this phone yet.");
    }
  }, []);

  const dateSwipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dx <= -80) {
          setDate((current) => shiftIsoDate(current, 1));
        } else if (gesture.dx >= 80) {
          setDate((current) => shiftIsoDate(current, -1));
        }
      },
    }),
  ).current;

  useEffect(() => {
    setSelectedIds(null);
  }, [date]);

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
      if (nameSheet.kind === "create" || nameSheet.kind === "create-for-relocate") {
        const targetDate = nameSheet.kind === "create-for-relocate" ? nameSheet.date : date;
        const live = await createDiaryMeal(targetDate, name);
        const created = live.meals.find((meal) => meal.name === name.trim()) ?? live.meals[live.meals.length - 1];
        if (nameSheet.kind === "create-for-relocate" && created) {
          setCreatedRelocateMeal({ date: targetDate, mealId: created.id, meals: live.meals });
        }
        if (targetDate === date) {
          setDay(live);
        }
        if (created) {
          await writeLastDiaryMeal({ mealId: created.id, mealName: created.name, date: targetDate });
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

  async function onSwipeDeleteEntry(entry: DiaryEntry) {
    setError(null);
    try {
      setDay(await deleteDiaryEntry(entry.id));
      setToast({
        message: `Removed ${entry.foodName}`,
        undo: async () => {
          if (entry.kind === "quick") {
            setDay(
              await addQuickDiaryEntry({
                mealId: entry.mealId,
                date: entry.date,
                label: entry.label ?? entry.foodName,
                kcal: entry.nutrients.kcal,
                proteinG: entry.nutrients.proteinG,
                carbsG: entry.nutrients.carbsG,
                fatG: entry.nutrients.fatG,
              }),
            );
            return;
          }
          if (!entry.foodId) {
            throw new Error("Could not restore that food.");
          }
          setDay(await addDiaryEntry(entry.mealId, entry.foodId, entry.grams, entry.date));
        },
      });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not delete that food.");
    }
  }

  async function confirmRelocate(input: { date: string; mealIds: string[]; mode: "copy" | "move" }) {
    if (!relocateRequest || relocating) {
      return;
    }
    setRelocating(true);
    setRelocateError(null);
    setError(null);
    try {
      const live = await relocateDiaryEntries(relocateRequest.entryIds, input.mealIds, input.mode);
      setDay(live);
      setRelocateRequest(null);
      setCreatedRelocateMeal(null);
      setSelectedIds(null);
    } catch (err) {
      setRelocateError(err instanceof ApiRequestError ? err.message : "Could not copy those foods.");
    } finally {
      setRelocating(false);
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

  function startSelect(entry: DiaryEntry) {
    setSelectedIds((current) => (current?.includes(entry.id) ? current : [...(current ?? []), entry.id]));
  }

  function toggleSelect(entry: DiaryEntry) {
    setSelectedIds((current) => {
      const ids = current ?? [];
      return ids.includes(entry.id) ? ids.filter((id) => id !== entry.id) : [...ids, entry.id];
    });
  }

  async function deleteSelected() {
    if (!selectedIds?.length || selectionDeleting) {
      return;
    }
    setSelectionDeleting(true);
    setError(null);
    try {
      let live = day;
      for (const id of selectedIds) {
        live = await deleteDiaryEntry(id);
      }
      if (live) {
        setDay(live);
      }
      setSelectedIds(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not delete those foods.");
      await load(date);
    } finally {
      setSelectionDeleting(false);
    }
  }

  async function saveDayTarget(kcal: number) {
    setTargetSaving(true);
    setTargetError(null);
    try {
      setDay(await setDiaryDayTarget(date, kcal));
      setTargetOpen(false);
    } catch (err) {
      setTargetError(err instanceof ApiRequestError ? err.message : "Could not save this day's calories.");
    } finally {
      setTargetSaving(false);
    }
  }

  async function clearDayTarget() {
    setTargetSaving(true);
    setTargetError(null);
    try {
      setDay(await clearDiaryDayTarget(date));
      setTargetOpen(false);
    } catch (err) {
      setTargetError(err instanceof ApiRequestError ? err.message : "Could not clear this day's calories.");
    } finally {
      setTargetSaving(false);
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
      overlay={
        <Toast
          visible={toast != null}
          message={toast?.message ?? ""}
          offset={inTabs ? tokens.tabBarHeight : 0}
          actionLabel={toast?.undo ? "Undo" : undefined}
          onAction={
            toast?.undo
              ? () => {
                  const undo = toast.undo;
                  setToast(null);
                  void undo().catch((err: unknown) => {
                    setError(err instanceof ApiRequestError ? err.message : "Could not restore that food.");
                  });
                }
              : undefined
          }
          onHide={() => setToast(null)}
        />
      }
      footer={
        selectedIds ? (
          <>
            <Button
              size="compact"
              label="Delete"
              onPress={() => void deleteSelected()}
              loading={selectionDeleting}
              disabled={selectedIds.length === 0}
            />
            <Button
              size="compact"
              label="Copy"
              variant="secondary"
              disabled={selectedIds.length === 0 || relocating}
              onPress={() => {
                setRelocateError(null);
                setCreatedRelocateMeal(null);
                setRelocateRequest({ entryIds: selectedIds });
              }}
            />
            <Button size="compact" label="Done" variant="ghost" onPress={() => setSelectedIds(null)} />
          </>
        ) : (
          <>
            {editing ? (
              <Button size="compact" label="Add meal group" onPress={() => setNameSheet({ kind: "create" })} />
            ) : null}
            <Button size="compact" label="Quick calories" variant="secondary" onPress={openQuickCal} />
            <Button size="compact" label="📝 New recipe" variant="secondary" onPress={() => setNameSheet({ kind: "recipe" })} />
          </>
        )
      }
    >
      <View style={styles.swipePage} {...dateSwipe.panHandlers}>
      <View style={styles.dateRow}>
        <Pressable onPress={() => setDate((current) => shiftIsoDate(current, -1))} accessibilityLabel="Previous day">
          <CaretLeft size={22} color={tokens.text} />
        </Pressable>
        <AppText variant="title">{date}</AppText>
        <Pressable onPress={() => setDate((current) => shiftIsoDate(current, 1))} accessibilityLabel="Next day">
          <CaretRight size={22} color={tokens.text} />
        </Pressable>
        <Pressable
          ref={menuButtonRef}
          onPress={openDiaryMenu}
          style={styles.menuButton}
          accessibilityRole="button"
          accessibilityLabel="Diary menu"
        >
          <DotsThreeVertical size={22} color={tokens.text} weight="bold" />
        </Pressable>
      </View>

      <RemainingBanner
        remaining={remaining ?? null}
        totalsKcal={totals?.kcal ?? null}
        targetKcal={day?.targets?.kcal ?? null}
      />

      {error ? (
        <AppText variant="body" color={error === "No day saved on this phone yet." ? "muted" : "danger"}>
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

      {!day && !error ? <DiaryDaySkeleton /> : null}

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
            onPressEntry={(entry) => {
              if (entry.kind === "quick") {
                router.push({
                  pathname: "/(app)/diary/quick-cal",
                  params: { date, mealId: meal.id, entryId: entry.id },
                } as Href);
                return;
              }
              if (!entry.foodId) return;
              router.push({
                pathname: `/(app)/diary/food/${entry.foodId}`,
                params: { date, mealId: meal.id, entryId: entry.id, returnTo: "diary" },
              } as Href);
            }}
            onAddFood={() =>
              router.push({
                pathname: "/(app)/diary/foods",
                params: { date, mealId: meal.id },
              } as Href)
            }
            onDeleteEntry={(entry) => void onSwipeDeleteEntry(entry)}
            onCopyEntry={(entryIds) => {
              setRelocateError(null);
              setCreatedRelocateMeal(null);
              setRelocateRequest({ entryIds });
            }}
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
            editing={editing}
            selecting={selectedIds != null}
            selectedIds={new Set(selectedIds ?? [])}
            onStartSelect={startSelect}
            onToggleSelect={toggleSelect}
          />
        ))}
      </View>

      {totals ? <DiaryDayNutrition date={date} totals={totals} targets={day?.targets ?? null} sex={sex} /> : null}
      </View>

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
            : nameSheet?.kind === "create-for-relocate"
              ? "Add group"
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
      <ContextMenu
        visible={menuOpen}
        anchor={menuAnchor}
        onClose={closeDiaryMenu}
        items={[
          {
            label: editing ? "Done editing" : "Edit diary",
            onPress: () => {
              setEditing((current) => !current);
            },
          },
          {
            label: "Calorie target",
            onPress: () => {
              setTargetError(null);
              setTargetOpen(true);
            },
          },
          {
            label: "Week overview",
            onPress: () => {
              router.push({ pathname: "/(app)/diary/week", params: { date } } as Href);
            },
          },
        ]}
      />
      <DiaryDayTargetSheet
        visible={targetOpen}
        date={date}
        currentKcal={day?.targets?.kcal ?? null}
        canClear={profileKcal != null && day?.targets != null && day.targets.kcal !== profileKcal}
        saving={targetSaving}
        error={targetError}
        onClose={() => setTargetOpen(false)}
        onSave={(kcal) => void saveDayTarget(kcal)}
        onClear={() => void clearDayTarget()}
      />
      <DiaryMoveSheet
        visible={relocateRequest != null && nameSheet == null}
        entryCount={relocateRequest?.entryIds.length ?? 0}
        sourceDate={date}
        created={createdRelocateMeal}
        saving={relocating}
        error={relocateError}
        onClose={() => {
          setRelocateRequest(null);
          setCreatedRelocateMeal(null);
          setRelocateError(null);
        }}
        onCreateMeal={(targetDate) => setNameSheet({ kind: "create-for-relocate", date: targetDate })}
        onConfirm={(input) => void confirmRelocate(input)}
      />
    </Screen>
  );
}

function DiaryDaySkeleton() {
  return (
    <View style={styles.skeleton}>
      <View style={styles.macros}>
        <Skeleton height={72} style={styles.macroSkeleton} />
        <Skeleton height={72} style={styles.macroSkeleton} />
        <Skeleton height={72} style={styles.macroSkeleton} />
        <Skeleton height={72} style={styles.macroSkeleton} />
      </View>
      <Skeleton height={92} />
      <Skeleton height={92} />
      <Skeleton height={92} />
    </View>
  );
}

const styles = StyleSheet.create({
  swipePage: {
    gap: tokens.space.md,
  },
  skeleton: {
    gap: tokens.space.md,
  },
  macros: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.md,
  },
  macroSkeleton: {
    flexGrow: 1,
    minWidth: "40%",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.sm,
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
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
