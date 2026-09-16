import { type Href, router, useFocusEffect } from "expo-router";
import { Globe, InstagramLogo, NotePencil, User } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { SavedRecipe } from "@savorly/shared";
import { listRecipes } from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { RecipeCard } from "../../../src/components/RecipeCard";
import { Screen } from "../../../src/components/Screen";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { SourceCard } from "../../../src/components/SourceCard";
import { replaceCache, searchCachedRecipes } from "../../../src/db/cache";
import { tokens } from "../../../src/theme/tokens";

export default function HomeScreen() {
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        void searchCachedRecipes("").then((cached) => {
          if (active) setRecipes(cached.slice(0, 4));
        });
        try {
          const live = await listRecipes();
          void replaceCache(live.recipes);
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

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="label" color="accent">
            Savorly
          </AppText>
          <AppText variant="display">Your cookbook</AppText>
        </View>
        <Pressable
          onPress={() => router.push("/(app)/account" as Href)}
          style={styles.avatar}
          accessibilityLabel="Account"
        >
          <User size={22} color={tokens.text} weight="regular" />
        </Pressable>
      </View>

      <SectionHeader title="Recently saved" actionLabel="See all" onAction={() => router.push("/(app)/recipes" as Href)} />
      {recipes.length === 0 ? (
        <AppText variant="body" color="muted">
          Imported recipes will land here after you review them.
        </AppText>
      ) : (
        <View style={styles.grid}>
          {recipes.map((recipe) => (
            <View key={recipe.id} style={styles.cell}>
              <RecipeCard
                recipe={recipe}
                onPress={() => router.push(`/(app)/recipe/${recipe.id}`)}
              />
            </View>
          ))}
        </View>
      )}

      <SectionHeader title="Save from" />
      <SourceCard
        title="Instagram"
        subtitle="Public Reel URL"
        icon={<InstagramLogo size={22} color={tokens.accent} weight="fill" />}
        onPress={() => router.push("/(app)/import/instagram")}
      />
      <SourceCard
        title="Website"
        subtitle="Recipe page URL"
        icon={<Globe size={22} color={tokens.accent} weight="regular" />}
        onPress={() => router.push("/(app)/import/website")}
      />
      <SourceCard
        title="Paste text"
        subtitle="Notes, caption, or a full recipe"
        icon={<NotePencil size={22} color={tokens.accent} weight="regular" />}
        onPress={() => router.push("/(app)/import/text")}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerCopy: {
    flex: 1,
    gap: tokens.space.sm,
    paddingRight: tokens.space.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderColor: tokens.border,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
  },
  cell: {
    width: "48%",
    minHeight: 210,
  },
});
