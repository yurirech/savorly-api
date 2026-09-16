import { Stack } from "expo-router";
import { tokens } from "../../src/theme/tokens";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tokens.bg },
        headerTintColor: tokens.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: tokens.bg },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: "Create account" }} />
    </Stack>
  );
}
