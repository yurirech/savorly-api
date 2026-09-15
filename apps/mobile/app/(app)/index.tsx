import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SavedRecipe } from "@savorly/shared";
import { listRecipes } from "../../src/api/client";
import { clearSession } from "../../src/auth/session";
import { RecipeCard } from "../../src/components/RecipeCard";
import { Screen } from "../../src/components/Screen";
import { SourceCard } from "../../src/components/SourceCard";
import { replaceCache, searchCachedRecipes } from "../../src/db/cache";
import { tokens } from "../../src/theme/tokens";

export default function HomeScreen() {
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const cached = await searchCachedRecipes("");
        if (active) setRecipes(cached.slice(0, 4));
        try {
          const live = await listRecipes();
          await replaceCache(live.recipes);
          if (active) setRecipes(live.recipes.slice(0, 4));
        } catch {
          // Offline: cached recipes remain.
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  async function signOut() {
    await clearSession();
    router.replace("/(auth)/login");
  }

  return (
    <Screen>
      <Text style={styles.kicker}>Import</Text>
      <Text style={styles.title}>Where is the recipe?</Text>
      <SourceCard
        title="Instagram Reel"
        subtitle="Public Reel URL. Caption and transcript only."
        onPress={() => router.push("/(app)/import/instagram")}
      />
      <SourceCard
        title="Recipe website"
        subtitle="Public webpage URL. JSON-LD first, then readable text."
        onPress={() => router.push("/(app)/import/website")}
      />
      <SourceCard
        title="Paste text"
        subtitle="Caption, transcript, notes, or a full recipe."
        onPress={() => router.push("/(app)/import/text")}
      />

      <View style={styles.row}>
        <Text style={styles.kicker}>Library</Text>
        <Pressable onPress={() => router.push("/(app)/library")}>
          <Text style={styles.link}>Search all</Text>
        </Pressable>
      </View>
      {recipes.length === 0 ? (
        <Text style={styles.empty}>Saved recipes will land here after review.</Text>
      ) : (
        recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onPress={() => router.push(`/(app)/recipe/${recipe.id}`)}
          />
        ))
      )}
      <Pressable onPress={() => void signOut()}>
        <Text style={styles.signOut}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: tokens.muted,
    fontSize: tokens.type.caption,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    color: tokens.text,
    fontSize: tokens.type.display,
    fontWeight: "700",
  },
  row: {
    marginTop: tokens.space.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  link: {
    color: tokens.accent,
    fontSize: tokens.type.body,
  },
  empty: {
    color: tokens.muted,
  },
  signOut: {
    color: tokens.muted,
    textAlign: "center",
    marginTop: tokens.space.lg,
  },
});
