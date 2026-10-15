import { type Href, router } from "expo-router";
import { Bone, Drop, Lightning, Shield } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  dayIntakeTargets,
  formatDiaryNumber,
  formatNutrientAmount,
  HEALTH_GROUPS,
  healthGroupPercent,
  type MicroTargets,
  type NutrientVector,
  type NutritionSex,
  type NutritionTargets,
} from "@savorly/shared";
import { AppText } from "../components/AppText";
import { tokens } from "../theme/tokens";

interface DiaryDayNutritionProps {
  date: string;
  totals: NutrientVector;
  targets: NutritionTargets | null;
  sex: NutritionSex | null;
  microTargets?: MicroTargets | null;
  remaining: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null;
  targetKcal: number | null;
}

const GROUP_ICONS = {
  electrolytes: Lightning,
  bone: Bone,
  energy: Lightning,
  blood: Drop,
  immune: Shield,
} as const;

function DiaryDayNutrition(props: DiaryDayNutritionProps) {
  const { date, totals, targets, sex, microTargets, remaining, targetKcal } = props;
  const [showGroups, setShowGroups] = useState(false);
  const hasTargets = targetKcal != null;
  const intakes = dayIntakeTargets(targets, sex, microTargets);
  const caloriePercent = hasTargets ? percentOf(totals.kcal, targetKcal) : 0;
  const macroRows = [
    {
      label: "Carbs",
      amount: formatNutrientAmount(totals.carbsG, "g"),
      percent: percentOf(totals.carbsG, intakes.carbsG),
      color: tokens.accent,
    },
    {
      label: "Protein",
      amount: formatNutrientAmount(totals.proteinG, "g"),
      percent: percentOf(totals.proteinG, intakes.proteinG),
      color: tokens.success,
    },
    {
      label: "Fat",
      amount: formatNutrientAmount(totals.fatG, "g"),
      percent: percentOf(totals.fatG, intakes.fatG),
      color: tokens.danger,
    },
    {
      label: "Saturated fat",
      amount: formatNutrientAmount(totals.saturatedFatG ?? 0, "g"),
      percent: percentOf(totals.saturatedFatG ?? 0, intakes.saturatedFatG),
      color: tokens.textMuted,
    },
    {
      label: "Fiber",
      amount: formatNutrientAmount(totals.fiberG ?? 0, "g"),
      percent: percentOf(totals.fiberG ?? 0, intakes.fiberG),
      color: tokens.accent,
    },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.summaryHead}>
        <View style={styles.summaryCopy}>
          {hasTargets ? (
            <>
              <AppText variant="label" color="muted">
                Remaining
              </AppText>
              <AppText variant="display">{remaining ? `${formatDiaryNumber(remaining.kcal)} kcal` : "—"}</AppText>
              <AppText variant="caption" color="muted">
                {remaining
                  ? `${formatDiaryNumber(remaining.proteinG)}g protein · ${formatDiaryNumber(remaining.carbsG)}g carbs · ${formatDiaryNumber(remaining.fatG)}g fat`
                  : "Set a profile to see targets."}
              </AppText>
              <AppText variant="caption" color="muted">
                Logged {formatDiaryNumber(totals.kcal)} / {formatDiaryNumber(targetKcal)} kcal
              </AppText>
            </>
          ) : null}
          {!hasTargets ? (
            <AppText variant="body" color="muted">
              Set your height, weight, and goal so remaining calories have something to chase.
            </AppText>
          ) : null}
        </View>
        <Pressable
          onPress={() => setShowGroups((current) => !current)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={showGroups ? "Hide health groups" : "Show health groups"}
        >
          <Shield size={22} color={showGroups ? tokens.accent : tokens.text} />
        </Pressable>
      </View>
      <View style={styles.meters}>
        {hasTargets ? (
          <IntakeMeter
            label="Calories"
            detail={`${formatDiaryNumber(totals.kcal)} kcal · ${caloriePercent}%`}
            percent={caloriePercent}
            color={tokens.accent}
            trackHeight={16}
          />
        ) : null}
        {macroRows.map((row) => (
          <IntakeMeter
            key={row.label}
            label={row.label}
            detail={`${row.amount} · ${row.percent}%`}
            percent={row.percent}
            color={row.color}
          />
        ))}
      </View>
      {showGroups ? (
      <View style={styles.groups}>
        {HEALTH_GROUPS.map((group) => {
          const Icon = GROUP_ICONS[group.id];
          const percent = healthGroupPercent(totals, group, intakes);
          return (
            <Pressable
              key={group.id}
              style={styles.group}
              onPress={() =>
                router.push({
                  pathname: "/(app)/diary/nutrient-group",
                  params: { date, group: group.id },
                } as Href)
              }
              accessibilityRole="button"
              accessibilityLabel={percent == null ? group.label : `${group.label}, ${percent} percent`}
            >
              <Icon size={22} color={tokens.accent} />
              <View style={styles.groupCopy}>
                <View style={styles.groupLabel}>
                  <AppText variant="body">{group.label}</AppText>
                  <AppText variant="caption" color="muted">
                    {percent == null ? "—" : `${percent}%`}
                  </AppText>
                </View>
                <IntakeMeter label="" detail="" percent={percent ?? 0} color={tokens.accent} hideCopy />
              </View>
            </Pressable>
          );
        })}
      </View>
      ) : null}
    </View>
  );
}

function percentOf(amount: number, target: number): number {
  if (!(target > 0)) {
    return 0;
  }
  return Math.round((amount / target) * 100);
}

interface IntakeMeterProps {
  label: string;
  detail: string;
  percent: number;
  color: string;
  hideCopy?: boolean;
  trackHeight?: number;
}

function IntakeMeter(props: IntakeMeterProps) {
  const { label, detail, percent, color, hideCopy = false, trackHeight = 8 } = props;
  const width = `${Math.min(100, Math.max(0, percent))}%` as const;

  return (
    <View style={styles.meter}>
      {!hideCopy && (
        <View style={styles.meterLabel}>
          <AppText variant="caption">{label}</AppText>
          <AppText variant="caption" color="muted">
            {detail}
          </AppText>
        </View>
      )}
      <View style={[styles.track, { height: trackHeight }]}>
        <View style={[styles.fill, { width, height: trackHeight, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border,
    padding: tokens.space.md,
    gap: tokens.space.md,
  },
  summaryHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.space.sm,
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
    gap: tokens.space.xs,
  },
  meters: {
    gap: tokens.space.sm,
  },
  groups: {
    gap: tokens.space.sm,
  },
  group: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingTop: tokens.space.sm,
  },
  groupCopy: {
    flex: 1,
    gap: tokens.space.xs,
  },
  groupLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  meter: {
    gap: tokens.space.xs,
  },
  meterLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  },
});

export default DiaryDayNutrition;
