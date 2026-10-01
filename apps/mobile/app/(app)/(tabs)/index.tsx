import { type Href, router, useFocusEffect } from "expo-router";
import { User } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { DiaryDayResponse, SavedRecipe } from "@savorly/shared";
import { fetchDiaryDay, fetchNutritionProfile, listRecipes } from "../../../src/api/client";
import RemainingBanner from "../../../src/diary/RemainingBanner";
import { todayIsoDate } from "../../../src/utils/isoDate";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { RecipeCard } from "../../../src/components/RecipeCard";
import { Screen } from "../../../src/components/Screen";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { searchCachedRecipes } from "../../../src/db/cache";
import { tokens } from "../../../src/theme/tokens";

export default function HomeScreen() {
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [day, setDay] = useState<DiaryDayResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecent = useCallback(async (isActive: () => boolean = () => true) => {
    void searchCachedRecipes("").then((cached) => {
      if (isActive()) setRecipes(cached.slice(0, 4));
    });
    try {
      const [live, diary] = await Promise.all([
        listRecipes(),
        fetchDiaryDay(todayIsoDate()).catch(() => null),
        fetchNutritionProfile().catch(() => null),
      ]);
      if (!isActive()) return;
      setRecipes(live.recipes.slice(0, 4));
      if (diary) setDay(diary);
    } catch {
      // Offline: cached recipes remain.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadRecent(() => active);
      return () => {
        active = false;
      };
    }, [loadRecent]),
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadRecent();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Screen safeBottom={false} onRefresh={() => void onRefresh()} refreshing={refreshing}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="label" color="accent">
            Savorly
          </AppText>
          <AppText variant="display">Your cookbook</AppText>
        </View>
        <Pressable
          onPress={() => router.push("/(app)/account" as Href)}
          style={styles.avatar}
          accessibilityLabel="Account"
        >
          <User size={22} color={tokens.text} weight="regular" />
        </Pressable>
      </View>

      {day ? (
        <RemainingBanner
          remaining={day.remaining}
          totalsKcal={day.totals.kcal}
          targetKcal={day.targets?.kcal ?? null}
          onPress={() => router.push("/(app)/(tabs)/diary" as Href)}
        />
      ) : null}
      <Button label="Suggest meal" onPress={() => router.push("/(app)/suggest-meal" as Href)} />

      <SectionHeader title="Recently saved" actionLabel="See all" onAction={() => router.push("/(app)/(tabs)/recipes" as Href)} />
      {recipes.length === 0 ? (
        <AppText variant="body" color="muted">
          Imported recipes will land here after you review them.
        </AppText>
      ) : (
        <View style={styles.grid}>
          {recipes.map((recipe) => (
            <View key={recipe.id} style={styles.cell}>
              <RecipeCard
                recipe={recipe}
                onPress={() => router.push(`/(app)/recipe/${recipe.id}`)}
              />
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerCopy: {
    flex: 1,
    gap: tokens.space.sm,
    paddingRight: tokens.space.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderColor: tokens.border,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
  },
  cell: {
    width: "48%",
    minHeight: 210,
  },
});
