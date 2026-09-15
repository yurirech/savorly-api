import { Stack } from "expo-router";
import { tokens } from "../../src/theme/tokens";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tokens.background },
        headerTintColor: tokens.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: tokens.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Savorly" }} />
      <Stack.Screen name="library" options={{ title: "Recipes" }} />
      <Stack.Screen name="import/instagram" options={{ title: "Instagram" }} />
      <Stack.Screen name="import/website" options={{ title: "Website" }} />
      <Stack.Screen name="import/text" options={{ title: "Paste text" }} />
      <Stack.Screen name="review" options={{ title: "Review recipe" }} />
      <Stack.Screen name="recipe/[id]" options={{ title: "Recipe" }} />
    </Stack>
  );
}
