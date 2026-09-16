import { router, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { CookbookSummary, FoodCategory, GeneratedRecipe } from "@savorly/shared";
import { createRecipe, listCookbooks, listRecipeCookbooks, setRecipeCookbooks, updateRecipe } from "../../src/api/client";
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
  const [cookbooks, setCookbooks] = useState<CookbookSummary[]>([]);
  const [selectedCookbookIds, setSelectedCookbookIds] = useState<string[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const live = await listCookbooks();
        setCookbooks(live.cookbooks);
        if (initial?.editingId) {
          const membership = await listRecipeCookbooks(initial.editingId);
          setSelectedCookbookIds(membership.cookbookIds);
        }
      } catch {
        // Saving still works without cookbook chips.
      }
    })();
  }, [initial?.editingId]);

  if (!recipe) {
    return (
      <Screen>
        <Text style={styles.title}>Nothing to review.</Text>
        <Button label="Back home" onPress={() => router.replace("/(app)" as Href)} />
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
      void upsertCachedRecipe(saved.recipe);
      if (selectedCookbookIds.length > 0 || initial?.editingId) {
        await setRecipeCookbooks(saved.recipe.id, selectedCookbookIds);
      }
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
      {cookbooks.length > 0 ? (
        <View style={styles.cookbookBlock}>
          <Text style={styles.label}>Cookbooks</Text>
          <View style={styles.chipRow}>
            {cookbooks.map((cookbook) => {
              const selected = selectedCookbookIds.includes(cookbook.id);
              return (
                <Pressable
                  key={cookbook.id}
                  onPress={() =>
                    setSelectedCookbookIds((current) =>
                      selected ? current.filter((id) => id !== cookbook.id) : [...current, cookbook.id],
                    )
                  }
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={selected ? styles.chipSelectedLabel : styles.chipLabel}>{cookbook.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
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
    borderRadius: tokens.radius.md,
  },
  kicker: {
    color: tokens.accent,
    fontSize: tokens.type.caption.fontSize,
    fontFamily: tokens.font.bodyBold,
    textTransform: "uppercase",
  },
  title: {
    color: tokens.text,
    fontSize: tokens.type.title.fontSize,
    fontFamily: tokens.font.display,
  },
  label: {
    color: tokens.textMuted,
    fontSize: tokens.type.caption.fontSize,
    fontFamily: tokens.font.bodyBold,
    textTransform: "uppercase",
  },
  source: {
    color: tokens.textMuted,
    lineHeight: 20,
  },
  uncertainties: {
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    gap: tokens.space.sm,
    borderWidth: 1,
    borderColor: tokens.border,
  },
  note: {
    color: tokens.text,
  },
  error: {
    color: tokens.danger,
  },
  cookbookBlock: {
    gap: tokens.space.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
  },
  chip: {
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.border,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    backgroundColor: tokens.surface,
  },
  chipSelected: {
    backgroundColor: tokens.accent,
    borderColor: tokens.accent,
  },
  chipLabel: {
    color: tokens.text,
    fontFamily: tokens.font.body,
    fontSize: tokens.type.caption.fontSize,
  },
  chipSelectedLabel: {
    color: tokens.bg,
    fontFamily: tokens.font.bodyBold,
    fontSize: tokens.type.caption.fontSize,
  },
});
