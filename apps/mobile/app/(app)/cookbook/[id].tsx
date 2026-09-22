import { Stack, router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { Check } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import type { CookbookDetail, SavedRecipe } from "@savorly/shared";
import {
  addRecipesToCookbook,
  deleteCookbook,
  getCookbook,
  listRecipes,
  removeRecipeFromCookbook,
  updateCookbook,
} from "../../../src/api/client";
import { imageForCategory } from "../../../src/assets/categoryImages";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Field } from "../../../src/components/Field";
import { RecipeGrid } from "../../../src/components/RecipeGrid";
import { Screen } from "../../../src/components/Screen";
import { replaceCache, searchCachedRecipes } from "../../../src/db/cache";
import { tokens } from "../../../src/theme/tokens";
import { confirmDestructive } from "../../../src/utils/confirmDestructive";

export default function CookbookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cookbookId = Array.isArray(id) ? id[0] : id;
  const [cookbook, setCookbook] = useState<CookbookDetail | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [picking, setPicking] = useState(false);
  const [allRecipes, setAllRecipes] = useState<SavedRecipe[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!cookbookId) return;
    try {
      const live = await getCookbook(cookbookId);
      setCookbook(live.cookbook);
      setName(live.cookbook.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load cookbook.");
    }
  }, [cookbookId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function startPicking() {
    if (!cookbook) return;
    void searchCachedRecipes("").then(setAllRecipes);
    try {
      const live = await listRecipes();
      void replaceCache(live.recipes);
      setAllRecipes(live.recipes);
    } catch {
      // Cached recipes are enough to pick from.
    }
    setSelectedIds(cookbook.recipes.map((recipe) => recipe.id));
    setPicking(true);
  }

  async function savePicks() {
    if (!cookbook) return;
    setSaving(true);
    setError(null);
    try {
      const current = new Set(cookbook.recipes.map((recipe) => recipe.id));
      const next = new Set(selectedIds);
      const toAdd = [...next].filter((recipeId) => !current.has(recipeId));
      const toRemove = [...current].filter((recipeId) => !next.has(recipeId));
      if (toAdd.length > 0) {
        const added = await addRecipesToCookbook(cookbook.id, toAdd);
        setCookbook(added.cookbook);
      }
      for (const recipeId of toRemove) {
        await removeRecipeFromCookbook(cookbook.id, recipeId);
      }
      const live = await getCookbook(cookbook.id);
      setCookbook(live.cookbook);
      setName(live.cookbook.name);
      setPicking(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update recipes.");
    } finally {
      setSaving(false);
    }
  }

  async function saveName() {
    if (!cookbook) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the cookbook a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateCookbook(cookbook.id, trimmed);
      await load();
      setRenaming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename cookbook.");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!cookbook) return;
    confirmDestructive(
      "Delete cookbook?",
      "Recipes stay in your library. Only this grouping is removed.",
      "Delete",
      () => {
        void (async () => {
          try {
            await deleteCookbook(cookbook.id);
            router.replace("/(app)/(tabs)/recipes" as Href);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not delete cookbook.");
          }
        })();
      },
    );
  }

  if (!cookbook) {
    return (
      <Screen onRefresh={() => void onRefresh()} refreshing={refreshing}>
        <AppText variant="body" color="muted">
          {error ?? "Loading cookbook…"}
        </AppText>
      </Screen>
    );
  }

  if (picking) {
    return (
      <Screen onRefresh={() => void onRefresh()} refreshing={refreshing}>
        <Stack.Screen options={{ title: "Add recipes" }} />
        <AppText variant="display">Add recipes</AppText>
        <AppText variant="body" color="muted">
          {cookbook.name}
        </AppText>
        {allRecipes.length === 0 ? (
          <AppText variant="body" color="muted">
            Save a recipe first, then add it here.
          </AppText>
        ) : (
          allRecipes.map((recipe) => {
            const selected = selectedIds.includes(recipe.id);
            return (
              <Pressable
                key={recipe.id}
                onPress={() =>
                  setSelectedIds((current) =>
                    selected ? current.filter((value) => value !== recipe.id) : [...current, recipe.id],
                  )
                }
                style={[styles.pickRow, selected && styles.pickRowSelected]}
              >
                <Image source={imageForCategory(recipe.category)} style={styles.pickImage} />
                <View style={styles.pickMeta}>
                  <AppText variant="title" numberOfLines={2}>
                    {recipe.title}
                  </AppText>
                  <AppText variant="caption" color="muted">
                    {recipe.category}
                  </AppText>
                </View>
                {selected ? <Check size={20} color={tokens.accent} weight="bold" /> : <View style={styles.unchecked} />}
              </Pressable>
            );
          })
        )}
        {error ? (
          <AppText variant="body" color="danger">
            {error}
          </AppText>
        ) : null}
        <Button label="Save" onPress={() => void savePicks()} loading={saving} />
        <Button label="Cancel" variant="ghost" onPress={() => setPicking(false)} />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={() => void onRefresh()} refreshing={refreshing}>
      <Stack.Screen options={{ title: cookbook.name }} />
      {renaming ? (
        <Field label="Name" value={name} onChangeText={setName} />
      ) : (
        <AppText variant="display">{cookbook.name}</AppText>
      )}
      <AppText variant="caption" color="muted">
        {cookbook.recipeCount === 1 ? "1 recipe" : `${cookbook.recipeCount} recipes`}
      </AppText>
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      {cookbook.recipes.length === 0 ? (
        <AppText variant="body" color="muted">
          This cookbook is empty. Add a few recipes to fill the cover.
        </AppText>
      ) : (
        <RecipeGrid recipes={cookbook.recipes} />
      )}
      <Button label="Add recipes" onPress={() => void startPicking()} />
      {renaming ? (
        <Button label="Save name" onPress={() => void saveName()} loading={saving} />
      ) : (
        <Button label="Rename" variant="secondary" onPress={() => setRenaming(true)} />
      )}
      <Button label="Delete cookbook" variant="ghost" onPress={confirmDelete} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border,
    padding: tokens.space.sm,
  },
  pickRowSelected: {
    borderColor: tokens.accent,
  },
  pickImage: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.sm,
  },
  pickMeta: {
    flex: 1,
    gap: tokens.space.xs,
  },
  unchecked: {
    width: 20,
    height: 20,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.border,
  },
});
