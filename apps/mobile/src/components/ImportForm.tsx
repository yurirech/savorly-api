import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import type { RecipeImportRequest } from "@savorly/shared";
import { ApiRequestError, importRecipe } from "../api/client";
import { setReviewDraft } from "../store/reviewDraft";
import { tokens } from "../theme/tokens";
import { Button } from "./Button";
import { Field } from "./Field";
import { Screen } from "./Screen";

type ImportFormProps = {
  title: string;
  subtitle: string;
  label: string;
  placeholder: string;
  keyboardType?: "url" | "default";
  multiline?: boolean;
  buildRequest: (value: string) => RecipeImportRequest;
};

export function ImportForm(props: ImportFormProps) {
  const { title, subtitle, label, placeholder, keyboardType, multiline, buildRequest } = props;
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [offerPaste, setOfferPaste] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    setOfferPaste(false);
    try {
      const result = await importRecipe(buildRequest(value.trim()));
      setReviewDraft(result.recipe);
      router.push("/(app)/review");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
        setOfferPaste(err.offerTextPaste);
      } else {
        setError("Import failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Field
        label={label}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize="none"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {offerPaste ? (
        <Pressable onPress={() => router.push("/(app)/import/text")}>
          <Text style={styles.link}>Paste the recipe text instead</Text>
        </Pressable>
      ) : null}
      <Button label="Import" onPress={() => void onSubmit()} loading={loading} disabled={!value.trim()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: tokens.text,
    fontSize: tokens.type.display,
    fontWeight: "700",
  },
  subtitle: {
    color: tokens.muted,
    fontSize: tokens.type.body,
    lineHeight: 22,
  },
  error: {
    color: tokens.danger,
  },
  link: {
    color: tokens.accent,
    fontSize: tokens.type.body,
  },
});
