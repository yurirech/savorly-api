import { type Href, router } from "expo-router";
import { Bone, Drop, Lightning, Shield } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import {
  dayIntakeTargets,
  formatNutrientAmount,
  HEALTH_GROUPS,
  healthGroupPercent,
  macroCalorieShares,
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
  remaining: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null;
  targetKcal: number | null;
}

const DONUT_SIZE = 132;
const DONUT_STROKE = 16;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

const GROUP_ICONS = {
  electrolytes: Lightning,
  bone: Bone,
  energy: Lightning,
  blood: Drop,
  immune: Shield,
} as const;

function DiaryDayNutrition(props: DiaryDayNutritionProps) {
  const { date, totals, targets, sex, remaining, targetKcal } = props;
  const [showGroups, setShowGroups] = useState(false);
  const hasTargets = targetKcal != null;
  const intakes = dayIntakeTargets(targets, sex);
  const shares = macroCalorieShares(totals);
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
              <AppText variant="display">{remaining ? `${remaining.kcal} kcal` : "—"}</AppText>
              <AppText variant="caption" color="muted">
                {remaining
                  ? `${remaining.proteinG}g protein · ${remaining.carbsG}g carbs · ${remaining.fatG}g fat`
                  : "Set a profile to see targets."}
              </AppText>
              <AppText variant="caption" color="muted">
                Logged {totals.kcal} / {targetKcal} kcal
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
      <View style={styles.macroRow}>
        <MacroDonut carbs={shares.carbs} protein={shares.protein} fat={shares.fat} />
        <View style={styles.macroMeters}>
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

interface MacroDonutProps {
  carbs: number;
  protein: number;
  fat: number;
}

function macroArcs(carbs: number, protein: number, fat: number) {
  const slices = [
    { id: "carbs", share: carbs, color: tokens.accent },
    { id: "protein", share: protein, color: tokens.success },
    { id: "fat", share: fat, color: tokens.danger },
  ];
  let cursor = 0;
  return slices.flatMap((slice) => {
    const length = slice.share * DONUT_CIRCUMFERENCE;
    const offset = DONUT_CIRCUMFERENCE / 4 - cursor;
    cursor += length;
    if (length <= 0) {
      return [];
    }
    return [{ id: slice.id, color: slice.color, length, offset }];
  });
}

function MacroDonut(props: MacroDonutProps) {
  const { carbs, protein, fat } = props;
  const arcs = macroArcs(carbs, protein, fat);

  return (
    <Svg width={DONUT_SIZE} height={DONUT_SIZE} accessibilityLabel="Macro calorie share">
      <Circle
        cx={DONUT_SIZE / 2}
        cy={DONUT_SIZE / 2}
        r={DONUT_RADIUS}
        stroke={tokens.border}
        strokeWidth={DONUT_STROKE}
        fill="none"
      />
      {arcs.map((arc) => (
        <Circle
          key={arc.id}
          cx={DONUT_SIZE / 2}
          cy={DONUT_SIZE / 2}
          r={DONUT_RADIUS}
          stroke={arc.color}
          strokeWidth={DONUT_STROKE}
          fill="none"
          strokeDasharray={`${arc.length} ${DONUT_CIRCUMFERENCE - arc.length}`}
          strokeDashoffset={arc.offset}
        />
      ))}
    </Svg>
  );
}

interface IntakeMeterProps {
  label: string;
  detail: string;
  percent: number;
  color: string;
  hideCopy?: boolean;
}

function IntakeMeter(props: IntakeMeterProps) {
  const { label, detail, percent, color, hideCopy = false } = props;
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
      <View style={styles.track}>
        <View style={[styles.fill, { width, backgroundColor: color }]} />
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
  macroRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.space.md,
  },
  macroMeters: {
    flex: 1,
    minWidth: 180,
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
