import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { UsdaFoodHit } from "@savorly/shared";
import { ApiRequestError, importUsdaFood, searchUsdaFoods, updateNutritionRecipeItem } from "../../../src/api/client";
import { isUnavailable } from "../../../src/offline/sync";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Field } from "../../../src/components/Field";
import { Screen } from "../../../src/components/Screen";
import { tokens } from "../../../src/theme/tokens";

export default function UsdaSearchScreen() {
  const params = useLocalSearchParams<{ q?: string; recipeId?: string; itemId?: string }>();
  const recipeId = Array.isArray(params.recipeId) ? params.recipeId[0] : params.recipeId;
  const itemId = Array.isArray(params.itemId) ? params.itemId[0] : params.itemId;
  const initialQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const [query, setQuery] = useState(initialQuery ?? "");
  const [hits, setHits] = useState<UsdaFoodHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSearch(nextQuery = query) {
    setLoading(true);
    setError(null);
    try {
      const live = await searchUsdaFoods(nextQuery);
      setHits(live.foods);
      if (live.foods.length === 0) {
        setError("No generics matched. Try “milk nonfat” or “peanut butter”.");
      }
    } catch (err) {
      setError(isUnavailable(err) ? "USDA search needs a connection." : err instanceof ApiRequestError ? err.message : "Could not search USDA.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const q = initialQuery?.trim();
    if (!q) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void searchUsdaFoods(q)
      .then((live) => {
        if (cancelled) return;
        setHits(live.foods);
        if (live.foods.length === 0) {
          setError("No generics matched. Try “milk nonfat” or “peanut butter”.");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(isUnavailable(err) ? "USDA search needs a connection." : err instanceof ApiRequestError ? err.message : "Could not search USDA.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialQuery]);

  async function onImport(hit: UsdaFoodHit) {
    setImportingId(hit.fdcId);
    setError(null);
    try {
      const saved = await importUsdaFood(hit.fdcId, hit.name);
      if (recipeId && itemId) {
        await updateNutritionRecipeItem(recipeId, itemId, { foodId: saved.food.id });
      }
      router.back();
    } catch (err) {
      setError(isUnavailable(err) ? "USDA search needs a connection." : err instanceof ApiRequestError ? err.message : "Could not import that food.");
    } finally {
      setImportingId(null);
    }
  }

  return (
    <Screen>
      <AppText variant="display">USDA search</AppText>
      <AppText variant="body" color="muted">
        Pull a generic staple, then it lives in your library. Brands you can type yourself.
      </AppText>
      <Field label="Food" value={query} onChangeText={setQuery} placeholder="milk nonfat" variant="search" />
      <Button size="compact" label="Search" onPress={() => void onSearch()} loading={loading} />
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      {hits.map((hit) => (
        <Pressable
          key={hit.fdcId}
          onPress={() => void onImport(hit)}
          disabled={importingId != null}
          style={styles.hit}
          accessibilityRole="button"
          accessibilityLabel={`Import ${hit.name}`}
        >
          <View style={styles.copy}>
            <AppText variant="title">{hit.name}</AppText>
            <AppText variant="caption" color="muted">
              {hit.dataType}
            </AppText>
          </View>
          <AppText variant="caption" color="accent">
            {importingId === hit.fdcId ? "Saving…" : "Save"}
          </AppText>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  },
  copy: {
    flex: 1,
    gap: tokens.space.xs,
  },
});
