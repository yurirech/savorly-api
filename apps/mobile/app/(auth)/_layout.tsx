import { useTheme } from "../../src/theme/theme";
import { Stack } from "expo-router";
import { tokens } from "../../src/theme/tokens";

export default function AuthLayout() {
  const colors = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: "Create account" }} />
    </Stack>
  );
}
