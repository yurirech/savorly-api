import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { SavedRecipe } from "@savorly/shared";
import { getRecipe } from "../../../src/api/client";
import { imageForCategory } from "../../../src/assets/categoryImages";
import { Button } from "../../../src/components/Button";
import { Screen } from "../../../src/components/Screen";
import { getCachedRecipe } from "../../../src/db/cache";
import { setReviewDraft } from "../../../src/store/reviewDraft";
import { tokens } from "../../../src/theme/tokens";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<SavedRecipe | null>(null);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const cached = await getCachedRecipe(id);
      if (cached) setRecipe(cached);
      try {
        const live = await getRecipe(id);
        setRecipe(live.recipe);
      } catch {
        // Cached recipe is enough offline.
      }
    })();
  }, [id]);

  if (!recipe) {
    return (
      <Screen>
        <Text style={styles.muted}>Loading recipe…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Image source={imageForCategory(recipe.category)} style={styles.hero} />
      <Text style={styles.category}>{recipe.category}</Text>
      <Text style={styles.title}>{recipe.title}</Text>
      <Text style={styles.source}>
        {recipe.source.author || recipe.source.sourceName || recipe.source.type}
      </Text>
      <Text style={styles.heading}>Ingredients</Text>
      {recipe.ingredients.map((ingredient) => (
        <Text key={ingredient.name} style={styles.body}>
          {[ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(" ")}
        </Text>
      ))}
      <Text style={styles.heading}>Steps</Text>
      {recipe.steps.map((step) => (
        <Text key={step.order} style={styles.body}>
          {step.order}. {step.text}
        </Text>
      ))}
      {recipe.uncertainties.length > 0 ? (
        <View style={styles.box}>
          <Text style={styles.heading}>Uncertainties</Text>
          {recipe.uncertainties.map((item) => (
            <Text key={item} style={styles.body}>
              {item}
            </Text>
          ))}
        </View>
      ) : null}
      <Button
        label="Edit"
        variant="secondary"
        onPress={() => {
          setReviewDraft(recipe, recipe.id);
          router.push("/(app)/review");
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: "100%",
    height: 200,
    borderRadius: tokens.radius,
  },
  category: {
    color: tokens.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
  },
  title: {
    color: tokens.text,
    fontSize: tokens.type.display,
    fontWeight: "700",
  },
  source: {
    color: tokens.muted,
  },
  heading: {
    color: tokens.text,
    fontSize: tokens.type.title,
    marginTop: tokens.space.sm,
  },
  body: {
    color: tokens.text,
    fontSize: tokens.type.body,
    lineHeight: 24,
  },
  muted: {
    color: tokens.muted,
  },
  box: {
    backgroundColor: tokens.surface,
    borderRadius: 16,
    padding: tokens.space.md,
    borderWidth: 1,
    borderColor: tokens.border,
  },
});
