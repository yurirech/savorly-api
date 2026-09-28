import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ApiRequestError, fetchDiaryDay, fetchMealStaples, setMealStaple } from "../api/client";
import { AppText } from "../components/AppText";
import { tokens } from "../theme/tokens";
import { todayIsoDate } from "../utils/isoDate";

interface MealStaplesSectionProps {
  foodId: string;
}

function MealStaplesSection(props: MealStaplesSectionProps) {
  const { foodId } = props;
  const [meals, setMeals] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const date = todayIsoDate();
      void Promise.all([fetchDiaryDay(date), fetchMealStaples(foodId)])
        .then(([day, staples]) => {
          if (!active) return;
          setMeals(day.meals.map((meal) => meal.name));
          setSelected(new Set(staples.mealNames));
          setError(null);
        })
        .catch((err) => {
          if (!active) return;
          setError(err instanceof ApiRequestError ? err.message : "Could not load meal staples.");
        });
      return () => {
        active = false;
      };
    }, [foodId]),
  );

  async function toggle(mealName: string) {
    const enabled = !selected.has(mealName);
    setError(null);
    try {
      const saved = await setMealStaple(foodId, { mealName, enabled, date: todayIsoDate() });
      setSelected(new Set(saved.mealNames));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not update that staple.");
    }
  }

  return (
    <View style={styles.section}>
      <AppText variant="label">Meal staples</AppText>
      {meals.length === 0 ? (
        <AppText variant="caption" color="muted">
          Add a meal group today to mark this food as a staple.
        </AppText>
      ) : null}
      <View style={styles.chips}>
        {meals.map((mealName) => {
          const on = selected.has(mealName);
          return (
            <Pressable
              key={mealName}
              onPress={() => void toggle(mealName)}
              style={[styles.chip, on && styles.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={on ? `Remove staple from ${mealName}` : `Add staple to ${mealName}`}
            >
              <AppText variant="caption" color={on ? "accent" : "text"}>
                {mealName}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: tokens.space.sm,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.xs,
    backgroundColor: tokens.surface,
  },
  chipOn: {
    borderColor: tokens.accent,
    backgroundColor: tokens.accentMuted,
  },
});

export default MealStaplesSection;
