import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { FoodCategory, GeneratedRecipe } from "@savorly/shared";
import { createRecipe, updateRecipe } from "../../src/api/client";
import { imageForCategory } from "../../src/assets/categoryImages";
import { Button } from "../../src/components/Button";
import { CategoryPicker } from "../../src/components/CategoryPicker";
import { Field } from "../../src/components/Field";
import { Screen } from "../../src/components/Screen";
import { upsertCachedRecipe } from "../../src/db/cache";
import { clearReviewDraft, getReviewDraft } from "../../src/store/reviewDraft";
import { tokens } from "../../src/theme/tokens";

export default function ReviewScreen() {
  const initial = useMemo(() => getReviewDraft(), []);
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(initial?.recipe ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!recipe) {
    return (
      <Screen>
        <Text style={styles.title}>Nothing to review.</Text>
        <Button label="Back home" onPress={() => router.replace("/(app)")} />
      </Screen>
    );
  }

  async function onSave() {
    if (!recipe) return;
    setSaving(true);
    setError(null);
    try {
      const saved = initial?.editingId
        ? await updateRecipe(initial.editingId, recipe)
        : await createRecipe(recipe);
      await upsertCachedRecipe(saved.recipe);
      clearReviewDraft();
      router.replace(`/(app)/recipe/${saved.recipe.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Image source={imageForCategory(recipe.category)} style={styles.hero} />
      <Text style={styles.kicker}>Review before saving</Text>
      <Field label="Title" value={recipe.title} onChangeText={(title) => setRecipe({ ...recipe, title })} />
      <Text style={styles.label}>Category</Text>
      <CategoryPicker
        value={recipe.category}
        onChange={(category: FoodCategory) => setRecipe({ ...recipe, category })}
      />
      <Field
        label="Ingredients"
        value={recipe.ingredients.map(formatIngredient).join("\n")}
        onChangeText={(value) =>
          setRecipe({
            ...recipe,
            ingredients: value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((name) => ({ name, quantity: null, unit: null, notes: null })),
          })
        }
        multiline
      />
      <Field
        label="Steps"
        value={recipe.steps.map((step) => step.text).join("\n")}
        onChangeText={(value) =>
          setRecipe({
            ...recipe,
            steps: value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((text, index) => ({ order: index + 1, text, durationMinutes: null, temperatureC: null })),
          })
        }
        multiline
      />
      <Field
        label="Tags"
        value={recipe.tags.join(", ")}
        onChangeText={(value) =>
          setRecipe({
            ...recipe,
            tags: value
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          })
        }
      />
      <Text style={styles.source}>
        Source: {recipe.source.author || recipe.source.sourceName || recipe.source.type}
        {recipe.source.originalUrl ? `\n${recipe.source.originalUrl}` : ""}
      </Text>
      {recipe.uncertainties.length > 0 ? (
        <View style={styles.uncertainties}>
          <Text style={styles.label}>Uncertainties</Text>
          {recipe.uncertainties.map((item) => (
            <Text key={item} style={styles.note}>
              {item}
            </Text>
          ))}
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Save recipe" onPress={() => void onSave()} loading={saving} />
    </Screen>
  );
}

function formatIngredient(ingredient: GeneratedRecipe["ingredients"][number]): string {
  const qty = ingredient.quantity != null ? String(ingredient.quantity) : "";
  return [qty, ingredient.unit, ingredient.name].filter(Boolean).join(" ");
}

const styles = StyleSheet.create({
  hero: {
    width: "100%",
    height: 180,
    borderRadius: tokens.radius,
  },
  kicker: {
    color: tokens.accent,
    fontSize: tokens.type.caption,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: tokens.text,
    fontSize: tokens.type.title,
  },
  label: {
    color: tokens.muted,
    fontSize: tokens.type.caption,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  source: {
    color: tokens.muted,
    lineHeight: 20,
  },
  uncertainties: {
    backgroundColor: tokens.surface,
    borderRadius: 16,
    padding: tokens.space.md,
    gap: 6,
    borderWidth: 1,
    borderColor: tokens.border,
  },
  note: {
    color: tokens.text,
  },
  error: {
    color: tokens.danger,
  },
});
