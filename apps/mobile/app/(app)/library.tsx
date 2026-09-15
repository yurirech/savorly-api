import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text } from "react-native";
import type { SavedRecipe } from "@savorly/shared";
import { listRecipes } from "../../src/api/client";
import { Field } from "../../src/components/Field";
import { RecipeCard } from "../../src/components/RecipeCard";
import { Screen } from "../../src/components/Screen";
import { replaceCache, searchCachedRecipes } from "../../src/db/cache";
import { tokens } from "../../src/theme/tokens";

export default function LibraryScreen() {
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);

  const runSearch = useCallback(async (value: string) => {
    const cached = await searchCachedRecipes(value);
    setRecipes(cached);
    try {
      const live = await listRecipes(value);
      await replaceCache(live.recipes);
      setRecipes(live.recipes);
    } catch {
      // Keep cached hits.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void runSearch(query);
    }, [query, runSearch]),
  );

  return (
    <Screen>
      <Text style={styles.title}>Your recipes</Text>
      <Field
        label="Search"
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          void runSearch(value);
        }}
        placeholder="Title, ingredient, category, tag, site or creator"
      />
      {recipes.length === 0 ? (
        <Text style={styles.empty}>No recipes match that search yet.</Text>
      ) : (
        recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onPress={() => router.push(`/(app)/recipe/${recipe.id}`)}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: tokens.text,
    fontSize: tokens.type.display,
    fontWeight: "700",
  },
  empty: {
    color: tokens.muted,
  },
});
