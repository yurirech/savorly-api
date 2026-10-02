import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { CaretLeft, CaretRight } from "phosphor-react-native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { defaultSelectedWeekDays, weekCountedStats } from "@savorly/shared";
import { ApiRequestError, fetchDiaryWeek, type DiaryWeek } from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Screen } from "../../../src/components/Screen";
import { tokens } from "../../../src/theme/tokens";
import { shiftIsoDate, startOfIsoWeek, todayIsoDate } from "../../../src/utils/isoDate";

const BAR_HEIGHT = 160;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function weekdayLabel(iso: string, index: number): string {
  return WEEKDAYS[index] ?? iso.slice(8);
}

function kcalLabel(value: number | null | undefined): string {
  return value == null ? "—" : `${value}`;
}

export default function DiaryWeekScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const opened = Array.isArray(params.date) ? params.date[0] : params.date;
  const [start, setStart] = useState(() => startOfIsoWeek(opened ?? todayIsoDate()));
  const [week, setWeek] = useState<DiaryWeek | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const today = todayIsoDate();

  const load = useCallback(async (nextStart: string) => {
    try {
      const live = await fetchDiaryWeek(nextStart);
      setWeek(live);
      setSelected(defaultSelectedWeekDays(live.days, todayIsoDate()));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not load this week.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const next = startOfIsoWeek(opened ?? todayIsoDate());
      setStart(next);
      void load(next);
    }, [opened, load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load(start);
    } finally {
      setRefreshing(false);
    }
  }, [load, start]);

  const scale = Math.max(1, ...(week?.days.map((day) => Math.max(day.eatenKcal, day.targetKcal ?? 0)) ?? [1]));
  const counted = useMemo(
    () => (week ? weekCountedStats(week.days, today, selected) : { eatenKcal: 0, countedDays: 0, averageKcal: null }),
    [selected, today, week],
  );

  return (
    <Screen onRefresh={() => void onRefresh()} refreshing={refreshing}>
      <View style={styles.nav}>
        <Pressable
          onPress={() => {
            const next = shiftIsoDate(start, -7);
            setStart(next);
            void load(next);
          }}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Previous week"
        >
          <CaretLeft size={22} color={tokens.text} />
        </Pressable>
        <AppText variant="title">
          {start} – {shiftIsoDate(start, 6)}
        </AppText>
        <Pressable
          onPress={() => {
            const next = shiftIsoDate(start, 7);
            setStart(next);
            void load(next);
          }}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Next week"
        >
          <CaretRight size={22} color={tokens.text} />
        </Pressable>
      </View>

      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}

      {week ? (
        <>
          <View style={styles.chart}>
            {week.days.map((day, index) => {
              const eatenHeight = (day.eatenKcal / scale) * BAR_HEIGHT;
              const targetHeight = ((day.targetKcal ?? 0) / scale) * BAR_HEIGHT;
              const isToday = day.date === today;
              const isSelected = selected.includes(day.date);
              const dimmed = !day.complete || day.eatenKcal === 0;
              return (
                <Pressable
                  key={day.date}
                  style={styles.column}
                  onPress={() => {
                    setSelected((current) =>
                      current.includes(day.date)
                        ? current.filter((date) => date !== day.date)
                        : [...current, day.date],
                    );
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${weekdayLabel(day.date, index)}${isSelected ? ", selected" : ""}`}
                >
                  <View
                    style={[
                      styles.track,
                      isToday && styles.trackToday,
                      isSelected && styles.trackSelected,
                      dimmed && styles.trackDimmed,
                    ]}
                  >
                    <View style={[styles.targetBar, { height: targetHeight }]} />
                    <View style={[styles.eatenBar, dimmed && styles.eatenBarDimmed, { height: eatenHeight }]} />
                  </View>
                  <AppText variant="caption" color={isSelected || isToday ? "accent" : "muted"}>
                    {weekdayLabel(day.date, index)}
                  </AppText>
                  <AppText variant="caption" color={dimmed ? "muted" : "text"}>
                    {day.eatenKcal}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.stats}>
            <View style={styles.statRow}>
              <StatCard label="Week estimate" value={kcalLabel(week.targetKcal)} hint="kcal" />
              <StatCard label="Remaining" value={kcalLabel(week.remainingKcal)} hint="kcal" />
            </View>
            <View style={styles.statRow}>
              <StatCard label="Eaten" value={String(counted.eatenKcal)} hint="kcal" />
              <StatCard
                label="Average"
                value={kcalLabel(counted.averageKcal)}
                hint="kcal / day"
              />
            </View>
            <AppText variant="caption" color="muted">
              {counted.countedDays === 1
                ? "Average from 1 complete day"
                : `Average from ${counted.countedDays} complete days`}
            </AppText>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  hint: string;
};

function StatCard(props: StatCardProps) {
  const { label, value, hint } = props;
  return (
    <View style={styles.statCard}>
      <AppText variant="label" color="muted">
        {label}
      </AppText>
      <AppText variant="title">
        {value} {hint}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.sm,
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: tokens.space.xs,
  },
  column: {
    flex: 1,
    alignItems: "center",
    gap: tokens.space.xs,
  },
  track: {
    height: BAR_HEIGHT,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: tokens.bgElevated,
    borderRadius: tokens.radius.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
  },
  trackToday: {
    borderColor: tokens.accentMuted,
  },
  trackSelected: {
    borderColor: tokens.accent,
  },
  trackDimmed: {
    opacity: 0.55,
  },
  targetBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: tokens.accentMuted,
  },
  eatenBar: {
    width: "55%",
    backgroundColor: tokens.accent,
    borderTopLeftRadius: tokens.radius.sm,
    borderTopRightRadius: tokens.radius.sm,
  },
  eatenBarDimmed: {
    backgroundColor: tokens.textMuted,
  },
  stats: {
    gap: tokens.space.sm,
  },
  statRow: {
    flexDirection: "row",
    gap: tokens.space.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border,
    padding: tokens.space.md,
    gap: tokens.space.xs,
  },
});
