import { Link, router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { login } from "../../src/api/client";
import { saveSession } from "../../src/auth/session";
import { Button } from "../../src/components/Button";
import { Field } from "../../src/components/Field";
import { Screen } from "../../src/components/Screen";
import { tokens } from "../../src/theme/tokens";

export default function LoginScreen() {
  const [email, setEmail] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      const session = await login(email.trim(), password);
      await saveSession(session);
      router.replace("/(app)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.kicker}>Savorly</Text>
      <Text style={styles.title}>Save recipes without the noise.</Text>
      <Text style={styles.hint}>Default login is admin / admin.</Text>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Sign in" onPress={() => void onSubmit()} loading={loading} />
      <Link href="/(auth)/register" style={styles.link}>
        Create an account
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: tokens.accent,
    fontSize: tokens.type.caption,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    color: tokens.text,
    fontSize: tokens.type.display,
    fontWeight: "700",
    lineHeight: 38,
  },
  hint: {
    color: tokens.muted,
    fontSize: tokens.type.body,
  },
  error: {
    color: tokens.danger,
  },
  link: {
    color: tokens.accent,
    textAlign: "center",
    fontSize: tokens.type.body,
  },
});
