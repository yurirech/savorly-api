import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  cappedProgress,
  dayIntakeTargets,
  findHealthGroup,
  formatNutrientAmount,
  healthNutrientAmount,
  type NutrientVector,
  type NutritionSex,
  type NutritionTargets,
} from "@savorly/shared";
import { fetchDiaryDay, fetchNutritionProfile } from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Screen } from "../../../src/components/Screen";
import { tokens } from "../../../src/theme/tokens";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function NutrientGroupScreen() {
  const params = useLocalSearchParams<{ date?: string; group?: string }>();
  const date = firstParam(params.date);
  const group = findHealthGroup(firstParam(params.group));
  const [totals, setTotals] = useState<NutrientVector | null>(null);
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [sex, setSex] = useState<NutritionSex | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!date) {
      setError("This nutrient group needs a diary day.");
      return;
    }
    try {
      const [live, profile] = await Promise.all([
        fetchDiaryDay(date),
        fetchNutritionProfile().catch(() => null),
      ]);
      setTotals(live.totals);
      setTargets(live.targets);
      setSex(profile?.profile?.sex ?? null);
      setError(null);
    } catch {
      setError("Could not load this day's nutrients.");
    }
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const intakes = totals ? dayIntakeTargets(targets, sex) : null;

  return (
    <Screen>
      <Stack.Screen options={{ title: group?.label ?? "Nutrients" }} />
      {group && !totals && !error ? (
        <AppText variant="body" color="muted">
          Loading today's nutrients.
        </AppText>
      ) : null}
      {!group ? (
        <AppText variant="body" color="muted">
          This nutrient group is not available.
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      {group && totals && intakes ? (
        <View style={styles.block}>
          <AppText variant="title">{group.label}</AppText>
          <AppText variant="body" color="muted">
            {group.summary}
          </AppText>
          {group.nutrients.map((nutrient) => {
            const amount = healthNutrientAmount(totals, nutrient);
            const target = nutrient.intakeKey ? intakes[nutrient.intakeKey] : null;
            const ratio = target == null ? null : cappedProgress(amount, target);
            const percent = amount == null || target == null || !(target > 0) ? null : Math.round((amount / target) * 100);
            const width = `${Math.round((ratio ?? 0) * 100)}%` as const;
            return (
              <View key={nutrient.id} style={styles.row}>
                <View style={styles.labelRow}>
                  <AppText variant="body">{nutrient.label}</AppText>
                  <AppText variant="caption" color="muted">
                    {amount == null ? "—" : `${formatNutrientAmount(amount, nutrient.unit)} · ${percent ?? 0}%`}
                  </AppText>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width }]} />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: tokens.space.md,
  },
  row: {
    gap: tokens.space.xs,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  track: {
    height: 8,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.border,
    overflow: "hidden",
  },
  fill: {
    height: 8,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.accent,
  },
});
