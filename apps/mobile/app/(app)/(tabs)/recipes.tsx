import { type Href, router, useFocusEffect } from "expo-router";
import { Plus } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { CookbookSummary, SavedRecipe } from "@savorly/shared";
import { ApiRequestError, listCookbooks, listRecipes } from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { CookbookCard } from "../../../src/components/CookbookCard";
import { Field } from "../../../src/components/Field";
import { RecipeGrid } from "../../../src/components/RecipeGrid";
import { Screen } from "../../../src/components/Screen";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import { replaceCache, searchCachedRecipes } from "../../../src/db/cache";
import { tokens } from "../../../src/theme/tokens";

type RecipesSegment = "cookbooks" | "recipes";

export default function RecipesScreen() {
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<RecipesSegment>("cookbooks");
  const [segmentBeforeSearch, setSegmentBeforeSearch] = useState<RecipesSegment>("cookbooks");
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [cookbooks, setCookbooks] = useState<CookbookSummary[]>([]);

  const runSearch = useCallback(async (value: string) => {
    void searchCachedRecipes(value).then(setRecipes);
    try {
      const live = await listRecipes(value);
      void replaceCache(live.recipes);
      setRecipes(live.recipes);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "unauthorized") {
        router.replace("/(auth)/login" as Href);
      }
    }
  }, []);

  const loadCookbooks = useCallback(async () => {
    try {
      const live = await listCookbooks();
      setCookbooks(live.cookbooks);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "unauthorized") {
        router.replace("/(auth)/login" as Href);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void runSearch(query);
      void loadCookbooks();
    }, [query, runSearch, loadCookbooks]),
  );

  function onQueryChange(value: string) {
    const wasSearching = query.trim().length > 0;
    const isSearching = value.trim().length > 0;
    if (isSearching && !wasSearching) {
      setSegmentBeforeSearch(segment);
      setSegment("recipes");
    }
    if (!isSearching && wasSearching) {
      setSegment(segmentBeforeSearch);
    }
    setQuery(value);
    void runSearch(value);
  }

  const visibleCookbooks = query.trim()
    ? cookbooks.filter((book) => book.name.toLowerCase().includes(query.trim().toLowerCase()))
    : cookbooks;

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="display">Recipes</AppText>
        {segment === "cookbooks" ? (
          <Pressable
            onPress={() => router.push("/(app)/new-cookbook" as Href)}
            style={styles.add}
            accessibilityLabel="Create cookbook"
          >
            <Plus size={22} color={tokens.accent} weight="bold" />
          </Pressable>
        ) : null}
      </View>
      <Field
        variant="search"
        label="Search"
        value={query}
        onChangeText={onQueryChange}
        placeholder="Title, ingredient, category, tag, site or creator"
      />
      <SegmentedControl
        value={segment}
        onChange={setSegment}
        options={[
          { value: "cookbooks", label: "Cookbooks" },
          { value: "recipes", label: "All recipes" },
        ]}
      />
      {segment === "cookbooks" ? (
        visibleCookbooks.length === 0 ? (
          <View style={styles.empty}>
            <AppText variant="body" color="muted">
              {query.trim()
                ? "No cookbooks match that search yet."
                : "No cookbooks yet. Create one to group recipes."}
            </AppText>
            {!query.trim() ? (
              <Pressable onPress={() => router.push("/(app)/new-cookbook" as Href)}>
                <AppText variant="body" color="accent">
                  Create cookbook
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.grid}>
            {visibleCookbooks.map((cookbook) => (
              <View key={cookbook.id} style={styles.cell}>
                <CookbookCard
                  cookbook={cookbook}
                  onPress={() => router.push(`/(app)/cookbook/${cookbook.id}` as Href)}
                />
              </View>
            ))}
          </View>
        )
      ) : recipes.length === 0 ? (
        <AppText variant="body" color="muted">
          No recipes match that search yet.
        </AppText>
      ) : (
        <RecipeGrid recipes={recipes} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  add: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.accentMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    gap: tokens.space.sm,
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
