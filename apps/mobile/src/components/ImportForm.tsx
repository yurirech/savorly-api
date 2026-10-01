import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import type { RecipeImportRequest } from "@savorly/shared";
import { ApiRequestError, importRecipe } from "../api/client";
import { isUnavailable } from "../offline/sync";
import { setReviewDraft } from "../store/reviewDraft";
import { tokens } from "../theme/tokens";
import { Button } from "./Button";
import { Field } from "./Field";
import { Screen } from "./Screen";
import { AppText } from "./AppText";

type ImportFormProps = {
  title: string;
  subtitle: string;
  label: string;
  placeholder: string;
  keyboardType?: "url" | "default";
  multiline?: boolean;
  allowManual?: boolean;
  buildRequest: (value: string) => RecipeImportRequest;
};

export function ImportForm(props: ImportFormProps) {
  const { title, subtitle, label, placeholder, keyboardType, multiline, allowManual, buildRequest } = props;
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [offerPaste, setOfferPaste] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    setOfferPaste(false);
    try {
      const request = buildRequest(value.trim());
      const result = await importRecipe(request);
      setReviewDraft(result.recipe);
      router.push("/(app)/review");
    } catch (err) {
      if (isUnavailable(err)) {
        setError(allowManual ? "Import needs a connection. Enter manually instead." : "This needs a connection.");
        setOfferPaste(!allowManual);
      } else if (err instanceof ApiRequestError) {
        setError(err.message);
        setOfferPaste(err.offerTextPaste);
      } else if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError("Import failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  function onManual() {
    const text = value.trim();
    const ingredients = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
    setReviewDraft({
      title: "",
      category: "other",
      ingredients,
      steps: [],
      tags: [],
      notes: null,
      uncertainties: [],
      nutrition: null,
      source: { type: "manual", originalText: text },
    });
    router.push("/(app)/review");
  }

  return (
    <Screen>
      <AppText variant="display">{title}</AppText>
      <AppText variant="body" color="muted">
        {subtitle}
      </AppText>
      <Field
        label={label}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize="none"
      />
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      {offerPaste ? (
        <Pressable onPress={() => router.push("/(app)/import/text")}>
          <AppText variant="body" color="accent">
            Paste the recipe text instead
          </AppText>
        </Pressable>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tokens.space[2] }}>
        <Button label="Import" onPress={() => void onSubmit()} loading={loading} disabled={!value.trim()} />
        {allowManual ? (
          <Button label="Enter manually" variant="secondary" onPress={onManual} disabled={!value.trim()} />
        ) : null}
      </View>
    </Screen>
  );
}
