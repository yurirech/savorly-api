import { router, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { CookbookSummary, FoodCategory, GeneratedRecipe } from "@savorly/shared";
import { formatIngredientLine, isCreamiRecipe, parseIngredientLines, recipeNotesText } from "@savorly/shared";
import { createCookbook, createRecipe, listCookbooks, listRecipeCookbooks, setRecipeCookbooks, updateRecipe } from "../../src/api/client";
import { imageForCategory } from "../../src/assets/categoryImages";
import { Button } from "../../src/components/Button";
import { CategoryPicker } from "../../src/components/CategoryPicker";
import { Field } from "../../src/components/Field";
import { RecipeNutritionSummary } from "../../src/components/RecipeNutritionSummary";
import { Screen } from "../../src/components/Screen";
import { upsertCachedRecipe } from "../../src/db/cache";
import { clearReviewDraft, getReviewDraft } from "../../src/store/reviewDraft";
import { tokens } from "../../src/theme/tokens";

export default function ReviewScreen() {
  const initial = useMemo(() => getReviewDraft(), []);
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(initial?.recipe ?? null);
  const [ingredientsDraft, setIngredientsDraft] = useState(() =>
    (initial?.recipe?.ingredients ?? []).map(formatIngredientLine).join("\n"),
  );
  const [stepsDraft, setStepsDraft] = useState(() =>
    (initial?.recipe?.steps ?? []).map((step) => step.text).join("\n"),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cookbooks, setCookbooks] = useState<CookbookSummary[]>([]);
  const [selectedCookbookIds, setSelectedCookbookIds] = useState<string[]>([]);
  const [newCookbookName, setNewCookbookName] = useState("");
  const [creatingCookbook, setCreatingCookbook] = useState(false);

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

  const currentRecipe = recipe;

  function commitIngredients() {
    const ingredients = parseIngredientLines(ingredientsDraft, currentRecipe.ingredients);
    setRecipe((current) => (current ? { ...current, ingredients } : current));
    setIngredientsDraft(ingredients.map(formatIngredientLine).join("\n"));
  }

  function recipeForSave(): GeneratedRecipe {
    return {
      ...currentRecipe,
      ingredients: parseIngredientLines(ingredientsDraft, currentRecipe.ingredients),
      steps: parseStepsDraft(stepsDraft, currentRecipe.steps),
    };
  }

  async function onSave() {
    const nextRecipe = recipeForSave();
    setSaving(true);
    setError(null);
    try {
      const saved = initial?.editingId
        ? await updateRecipe(initial.editingId, nextRecipe)
        : await createRecipe(nextRecipe);
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

  async function onCreateCookbook() {
    const trimmed = newCookbookName.trim();
    if (!trimmed) {
      setError("Give the cookbook a name.");
      return;
    }
    setCreatingCookbook(true);
    setError(null);
    try {
      const created = await createCookbook(trimmed);
      setCookbooks((current) => [created.cookbook, ...current]);
      setSelectedCookbookIds((current) => [...current, created.cookbook.id]);
      setNewCookbookName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create cookbook.");
    } finally {
      setCreatingCookbook(false);
    }
  }

  return (
    <Screen>
      <Image source={imageForCategory(recipe.category)} style={styles.hero} />
      <Text style={styles.kicker}>Review before saving</Text>
      <Field
        label="Title"
        value={recipe.title}
        onChangeText={(title) => setRecipe((current) => (current ? { ...current, title } : current))}
      />
      <Text style={styles.label}>Category</Text>
      <CategoryPicker
        value={recipe.category}
        onChange={(category: FoodCategory) =>
          setRecipe((current) => (current ? { ...current, category } : current))
        }
      />
      <Field
        label="Servings"
        value={recipe.servings != null ? String(recipe.servings) : ""}
        onChangeText={(value) => {
          const trimmed = value.trim();
          setRecipe((current) => {
            if (!current) return current;
            if (!trimmed) return { ...current, servings: null };
            const servings = Number(trimmed);
            return {
              ...current,
              servings: Number.isFinite(servings) && servings > 0 ? servings : current.servings,
            };
          });
        }}
        keyboardType="numeric"
        placeholder="Original serving count"
      />
      <Field
        label="Ingredients"
        value={ingredientsDraft}
        onChangeText={setIngredientsDraft}
        onEndEditing={commitIngredients}
        multiline
      />
      {isCreamiRecipe(recipe) ? null : (
        <Field label="Steps" value={stepsDraft} onChangeText={setStepsDraft} multiline />
      )}
      <Field
        label="Tags"
        value={recipe.tags.join(", ")}
        onChangeText={(value) =>
          setRecipe((current) =>
            current
              ? {
                  ...current,
                  tags: value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                }
              : current,
          )
        }
      />
      <Field
        label="Notes"
        value={recipeNotesText(recipe)}
        onChangeText={(value) =>
          setRecipe((current) => (current ? { ...current, notes: value, uncertainties: [] } : current))
        }
        multiline
        placeholder="Anything you want to remember"
      />
      <RecipeNutritionSummary nutrition={recipe.nutrition} />
      <View style={styles.cookbookBlock}>
        <Text style={styles.label}>Cookbooks</Text>
        <Field
          label="New cookbook"
          value={newCookbookName}
          onChangeText={setNewCookbookName}
          placeholder="Weeknight dinners"
        />
        <Button
          label="Create cookbook"
          variant="secondary"
          onPress={() => void onCreateCookbook()}
          loading={creatingCookbook}
          disabled={!newCookbookName.trim()}
        />
        {cookbooks.length > 0 ? (
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
        ) : (
          <Text style={styles.source}>Create a cookbook to file this recipe when you save.</Text>
        )}
      </View>
      <Text style={styles.source}>
        Source: {recipe.source.author || recipe.source.sourceName || recipe.source.type}
        {recipe.source.originalUrl ? `\n${recipe.source.originalUrl}` : ""}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Save recipe" onPress={() => void onSave()} loading={saving} />
    </Screen>
  );
}

function parseStepsDraft(text: string, previous: GeneratedRecipe["steps"]): GeneratedRecipe["steps"] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((stepText, index) => ({
      order: index + 1,
      text: stepText,
      durationMinutes: previous[index]?.durationMinutes ?? null,
      temperatureC: previous[index]?.temperatureC ?? null,
    }));
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
