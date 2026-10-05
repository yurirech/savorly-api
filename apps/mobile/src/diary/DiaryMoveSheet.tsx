import { CaretLeft, CaretRight } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import type { DiaryMealGroup } from "@savorly/shared";
import { ApiRequestError, fetchDiaryDay } from "../api/client";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { SegmentedControl } from "../components/SegmentedControl";
import { tokens } from "../theme/tokens";
import { shiftIsoDate } from "../utils/isoDate";

export type RelocateMode = "copy" | "move";

interface DiaryMoveSheetProps {
  visible: boolean;
  entryCount: number;
  sourceDate: string;
  created?: { date: string; mealId: string; meals: DiaryMealGroup[] } | null;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onCreateMeal: (date: string) => void;
  onConfirm: (input: { date: string; mealIds: string[]; mode: RelocateMode }) => void;
}

function foodCountLabel(count: number): string {
  return count === 1 ? "1 food" : `${count} foods`;
}

function DiaryMoveSheet(props: DiaryMoveSheetProps) {
  const { visible, entryCount, sourceDate, created, saving, error, onClose, onCreateMeal, onConfirm } = props;
  const [mode, setMode] = useState<RelocateMode>("copy");
  const [date, setDate] = useState(sourceDate);
  const [meals, setMeals] = useState<DiaryMealGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setMode("copy");
    setDate(sourceDate);
    setSelectedIds([]);
    setLoadError(null);
    void loadMeals(sourceDate);
  }, [visible, sourceDate]);

  useEffect(() => {
    if (!visible || !created || created.date !== date) return;
    setMeals(created.meals);
    setSelectedIds((current) => (current.includes(created.mealId) ? current : [...current, created.mealId]));
  }, [visible, created, date]);

  async function loadMeals(nextDate: string) {
    setLoading(true);
    setLoadError(null);
    try {
      const live = await fetchDiaryDay(nextDate);
      setMeals(live.meals);
    } catch (err) {
      setMeals([]);
      setLoadError(err instanceof ApiRequestError ? err.message : "Could not load meal groups.");
    } finally {
      setLoading(false);
    }
  }

  function changeDate(days: number) {
    const next = shiftIsoDate(date, days);
    setDate(next);
    setSelectedIds([]);
    void loadMeals(next);
  }

  function toggleMeal(mealId: string) {
    setSelectedIds((current) =>
      current.includes(mealId) ? current.filter((id) => id !== mealId) : [...current, mealId],
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <AppText variant="title">{mode === "move" ? "Move foods" : "Copy foods"}</AppText>
          <AppText variant="body" color="muted">
            {foodCountLabel(entryCount)}
          </AppText>
          <SegmentedControl
            value={mode}
            onChange={setMode}
            options={[
              { value: "copy", label: "Copy" },
              { value: "move", label: "Move" },
            ]}
          />
          <View style={styles.dateRow}>
            <Pressable onPress={() => changeDate(-1)} accessibilityRole="button" accessibilityLabel="Previous day">
              <CaretLeft size={22} color={tokens.text} />
            </Pressable>
            <AppText variant="title">{date}</AppText>
            <Pressable onPress={() => changeDate(1)} accessibilityRole="button" accessibilityLabel="Next day">
              <CaretRight size={22} color={tokens.text} />
            </Pressable>
          </View>
          {loading ? (
            <AppText variant="body" color="muted">
              Loading groups…
            </AppText>
          ) : null}
          {loadError ? (
            <AppText variant="body" color="danger">
              {loadError}
            </AppText>
          ) : null}
          {error ? (
            <AppText variant="body" color="danger">
              {error}
            </AppText>
          ) : null}
          {!loading && meals.length === 0 && !loadError ? (
            <AppText variant="body" color="muted">
              Add a meal group on this day first.
            </AppText>
          ) : null}
          <View style={styles.groups}>
            {meals.map((meal) => {
              const selected = selectedIds.includes(meal.id);
              return (
                <Pressable
                  key={meal.id}
                  onPress={() => toggleMeal(meal.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={meal.name}
                  style={[styles.group, selected && styles.groupSelected]}
                >
                  <AppText variant="caption" color={selected ? "accent" : "text"}>
                    {meal.name}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.actions}>
            <Button
              size="compact"
              label={mode === "move" ? "Move" : "Copy"}
              onPress={() => onConfirm({ date, mealIds: selectedIds, mode })}
              loading={saving}
              disabled={selectedIds.length === 0 || loading}
            />
            <Button size="compact" label="New meal group" variant="ghost" onPress={() => onCreateMeal(date)} />
            <Button size="compact" label="Cancel" variant="ghost" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: tokens.scrim,
    justifyContent: "center",
    padding: tokens.space.lg,
  },
  sheet: {
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
    gap: tokens.space.sm,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.sm,
  },
  groups: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
  },
  group: {
    minHeight: 32,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.bgElevated,
    justifyContent: "center",
  },
  groupSelected: {
    borderColor: tokens.accent,
    backgroundColor: tokens.accentMuted,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.space.sm,
  },
});

export default DiaryMoveSheet;
