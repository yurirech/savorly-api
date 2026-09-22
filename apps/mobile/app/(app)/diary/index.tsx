import { type Href, router, useFocusEffect } from "expo-router";
import { CaretLeft, CaretRight } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { DiaryDayResponse } from "@savorly/shared";
import { ApiRequestError, deleteDiaryEntry, fetchDiaryDay } from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Screen } from "../../../src/components/Screen";
import { tokens } from "../../../src/theme/tokens";
import { shiftIsoDate, todayIsoDate } from "../../../src/utils/isoDate";

export default function DiaryScreen() {
  const [date, setDate] = useState(todayIsoDate);
  const [day, setDay] = useState<DiaryDayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  async function onDelete(entryId: string) {
    try {
      const live = await deleteDiaryEntry(entryId);
      setDay(live);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not remove that entry.");
    }
  }

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

      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}

      <Button label="Log food" onPress={() => router.push({ pathname: "/(app)/diary/log", params: { date } } as Href)} />
      <Button label="My foods" variant="secondary" onPress={() => router.push("/(app)/diary/foods" as Href)} />
      <Button label="Targets" variant="ghost" onPress={() => router.push("/(app)/diary/profile" as Href)} />

      {day && day.entries.length === 0 ? (
        <AppText variant="body" color="muted">
          Add foods you actually eat, then log grams for the day.
        </AppText>
      ) : null}

      {day?.entries.map((entry) => (
        <View key={entry.id} style={styles.entry}>
          <View style={styles.entryCopy}>
            <AppText variant="title">{entry.foodName}</AppText>
            <AppText variant="caption" color="muted">
              {entry.grams} g · {entry.nutrients.kcal} kcal
            </AppText>
          </View>
          <Pressable onPress={() => void onDelete(entry.id)} accessibilityLabel={`Remove ${entry.foodName}`}>
            <AppText variant="caption" color="danger">
              Remove
            </AppText>
          </Pressable>
        </View>
      ))}
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
  entry: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  },
  entryCopy: {
    flex: 1,
    gap: tokens.space.xs,
  },
});
