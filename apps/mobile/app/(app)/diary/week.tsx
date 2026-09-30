import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { CaretLeft, CaretRight } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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

export default function DiaryWeekScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const opened = Array.isArray(params.date) ? params.date[0] : params.date;
  const [start, setStart] = useState(() => startOfIsoWeek(opened ?? todayIsoDate()));
  const [week, setWeek] = useState<DiaryWeek | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const today = todayIsoDate();

  const load = useCallback(async (nextStart: string) => {
    try {
      setWeek(await fetchDiaryWeek(nextStart));
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
              return (
                <View key={day.date} style={styles.column}>
                  <View style={[styles.track, isToday && styles.trackToday]}>
                    <View style={[styles.targetBar, { height: targetHeight }]} />
                    <View style={[styles.eatenBar, { height: eatenHeight }]} />
                  </View>
                  <AppText variant="caption" color={isToday ? "accent" : "muted"}>
                    {weekdayLabel(day.date, index)}
                  </AppText>
                  <AppText variant="caption">{day.eatenKcal}</AppText>
                </View>
              );
            })}
          </View>
          <View style={styles.stats}>
            <AppText variant="body">Eaten {week.eatenKcal} kcal</AppText>
            <AppText variant="body">
              Remaining {week.remainingKcal == null ? "—" : week.remainingKcal} kcal
            </AppText>
            <AppText variant="body">Average {week.averageKcal} kcal a day</AppText>
          </View>
        </>
      ) : null}
    </Screen>
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
  },
  trackToday: {
    borderWidth: 1,
    borderColor: tokens.accent,
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
  stats: {
    gap: tokens.space.xs,
  },
});
