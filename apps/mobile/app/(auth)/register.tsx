import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { register } from "../../src/api/client";
import { saveSession } from "../../src/auth/session";
import { Button } from "../../src/components/Button";
import { Field } from "../../src/components/Field";
import { Screen } from "../../src/components/Screen";
import { tokens } from "../../src/theme/tokens";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      const session = await register(email.trim(), password);
      await saveSession(session);
      router.replace("/(app)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Create your kitchen.</Text>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Create account" onPress={() => void onSubmit()} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: tokens.text,
    fontSize: tokens.type.display,
    fontWeight: "700",
  },
  error: {
    color: tokens.danger,
  },
});
