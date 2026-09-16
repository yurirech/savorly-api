import { router } from "expo-router";
import { useEffect, useState } from "react";
import { clearSession, getUser } from "../../src/auth/session";
import { AppText } from "../../src/components/AppText";
import { Button } from "../../src/components/Button";
import { Screen } from "../../src/components/Screen";

export default function AccountScreen() {
  const [email, setEmail] = useState<string>("");

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
      <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
    </Screen>
  );
}
