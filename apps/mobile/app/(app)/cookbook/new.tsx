import { type Href, router } from "expo-router";
import { useState } from "react";
import { createCookbook } from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Field } from "../../../src/components/Field";
import { Screen } from "../../../src/components/Screen";

export default function NewCookbookScreen() {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the cookbook a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createCookbook(trimmed);
      router.replace(`/(app)/cookbook/${created.cookbook.id}` as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create cookbook.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <AppText variant="display">New cookbook</AppText>
      <AppText variant="body" color="muted">
        A place to group recipes you cook together — weeknights, baking, guests.
      </AppText>
      <Field label="Name" value={name} onChangeText={setName} placeholder="Weeknight dinners" />
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      <Button label="Create cookbook" onPress={() => void onSave()} loading={saving} disabled={!name.trim()} />
    </Screen>
  );
}
