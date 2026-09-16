import { router, type Href } from "expo-router";
import { useState } from "react";
import { register } from "../../src/api/client";
import { saveSession } from "../../src/auth/session";
import { AppText } from "../../src/components/AppText";
import { Button } from "../../src/components/Button";
import { Field } from "../../src/components/Field";
import { Screen } from "../../src/components/Screen";

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
      router.replace("/(app)" as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AppText variant="display">Create your kitchen.</AppText>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      <Button label="Create account" onPress={() => void onSubmit()} loading={loading} />
    </Screen>
  );
}
