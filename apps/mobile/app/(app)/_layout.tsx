import { Stack } from "expo-router";
import { tokens } from "../../src/theme/tokens";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tokens.bg },
        headerTintColor: tokens.text,
        headerTitleStyle: { fontFamily: tokens.font.bodyBold },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: tokens.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="account" options={{ title: "Account" }} />
      <Stack.Screen name="import/instagram" options={{ title: "Instagram" }} />
      <Stack.Screen name="import/website" options={{ title: "Website" }} />
      <Stack.Screen name="import/text" options={{ title: "Paste text" }} />
      <Stack.Screen name="review" options={{ title: "Review recipe" }} />
      <Stack.Screen name="recipe/[id]" options={{ title: "Recipe", headerTransparent: true, headerTintColor: tokens.text }} />
      <Stack.Screen name="new-cookbook" options={{ title: "New cookbook" }} />
      <Stack.Screen name="cookbook/[id]" options={{ title: "Cookbook" }} />
      <Stack.Screen name="suggest-meal" options={{ title: "Suggest meal" }} />
    </Stack>
  );
}
