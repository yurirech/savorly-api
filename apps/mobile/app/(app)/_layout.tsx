import { Stack } from "expo-router";
import { useEffect } from "react";
import { ensureNevoSnapshot, fetchNutritionProfile, listCookbooks, listNutritionFoods, listRecipes, prefetchDiaryDays } from "../../src/api/client";
import { flushOutbox } from "../../src/offline/sync";
import { tokens } from "../../src/theme/tokens";
import { useTheme } from "../../src/theme/theme";

export default function AppLayout() {
  const colors = useTheme();

  useEffect(() => {
    void (async () => {
      await flushOutbox();
      await Promise.allSettled([
        listRecipes(),
        listCookbooks(),
        listNutritionFoods(),
        fetchNutritionProfile(),
        ensureNevoSnapshot(),
        prefetchDiaryDays(),
      ]);
    })();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: tokens.font.bodyBold },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="account" options={{ title: "Account" }} />
      <Stack.Screen name="import/instagram" options={{ title: "Video link" }} />
      <Stack.Screen name="import/website" options={{ title: "Website" }} />
      <Stack.Screen name="import/text" options={{ title: "Paste text" }} />
      <Stack.Screen name="review" options={{ title: "Review recipe" }} />
      <Stack.Screen name="recipe/[id]" options={{ title: "Recipe", headerTransparent: true, headerTintColor: colors.text }} />
      <Stack.Screen name="recipe-chat" options={{ title: "This recipe" }} />
      <Stack.Screen name="new-cookbook" options={{ title: "New cookbook" }} />
      <Stack.Screen name="cookbook/[id]" options={{ title: "Cookbook" }} />
      <Stack.Screen name="suggest-meal" options={{ title: "Suggest meal" }} />
      <Stack.Screen name="pantry" options={{ title: "My pantry" }} />
      <Stack.Screen name="diary/index" options={{ title: "Diary" }} />
      <Stack.Screen name="diary/week" options={{ title: "Week" }} />
      <Stack.Screen name="diary/foods" options={{ title: "My foods" }} />
      <Stack.Screen name="diary/food/[id]" options={{ title: "Food" }} />
      <Stack.Screen name="diary/food-form" options={{ title: "Manual food" }} />
      <Stack.Screen name="diary/nevo-search" options={{ title: "NEVO search" }} />
      <Stack.Screen name="diary/usda-search" options={{ title: "USDA search" }} />
      <Stack.Screen name="diary/log" options={{ title: "Log food" }} />
      <Stack.Screen name="diary/profile" options={{ title: "Targets" }} />
      <Stack.Screen name="diary/nutrient-group" options={{ title: "Nutrients" }} />
    </Stack>
  );
}
