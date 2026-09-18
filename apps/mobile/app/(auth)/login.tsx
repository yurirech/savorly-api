import { Link, router, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { login } from "../../src/api/client";
import { saveSession } from "../../src/auth/session";
import { AppText } from "../../src/components/AppText";
import { Button } from "../../src/components/Button";
import { Field } from "../../src/components/Field";
import { Screen } from "../../src/components/Screen";
import { tokens } from "../../src/theme/tokens";

export default function LoginScreen() {
  const [email, setEmail] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      const session = await login(email.trim(), password);
      await saveSession(session);
      router.replace("/(app)" as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AppText variant="label" color="accent">
        Savorly
      </AppText>
      <AppText variant="display">Recipes without the noise.</AppText>
      <AppText variant="body" color="muted">
        Sign in to your kitchen.
      </AppText>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      <Button label="Sign in" onPress={() => void onSubmit()} loading={loading} />
      <Link href="/(auth)/register" style={styles.link}>
        Create an account
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: {
    color: tokens.accent,
    textAlign: "center",
    fontSize: tokens.type.body.fontSize,
    fontFamily: tokens.font.bodyMedium,
  },
});
