import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { clearSession, getUser } from "../../src/auth/session";
import { AppText } from "../../src/components/AppText";
import { Button } from "../../src/components/Button";
import { Screen } from "../../src/components/Screen";
import { useSetTheme, useTheme, useThemeId } from "../../src/theme/theme";
import { THEMES } from "../../src/theme/themes";
import { tokens } from "../../src/theme/tokens";

export default function AccountScreen() {
  const [email, setEmail] = useState<string>("");
  const themeId = useThemeId();
  const colors = useTheme();
  const setThemeId = useSetTheme();

  useEffect(() => {
    void getUser().then((user) => setEmail(user?.email ?? ""));
  }, []);

  async function signOut() {
    await clearSession();
    router.replace("/(auth)/login");
  }

  return (
    <Screen>
      <AppText variant="label" color="accent">
        Signed in
      </AppText>
      <AppText variant="display">{email || "Your kitchen"}</AppText>
      <AppText variant="body" color="muted">
        Recipes on this phone stay cached offline. Sign out only clears the session.
      </AppText>
      <AppText variant="label" color="accent">
        Appearance
      </AppText>
      <View style={styles.swatches}>
        {THEMES.map((theme) => {
          const selected = theme.id === themeId;
          return (
            <Pressable
              key={theme.id}
              accessibilityRole="button"
              accessibilityLabel={theme.name}
              accessibilityState={{ selected }}
              onPress={() => setThemeId(theme.id)}
              style={[
                styles.swatch,
                {
                  backgroundColor: theme.colors.accent,
                  borderColor: selected ? colors.text : "transparent",
                },
              ]}
            />
          );
        })}
      </View>
      <AppText variant="body">{THEMES.find((theme) => theme.id === themeId)?.name}</AppText>
      <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  swatches: {
    flexDirection: "row",
    gap: tokens.space.md,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.full,
    borderWidth: 3,
  },
});
