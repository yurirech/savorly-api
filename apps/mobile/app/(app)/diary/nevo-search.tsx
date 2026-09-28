import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { NEVO_ATTRIBUTION, type NevoFoodHit } from "@savorly/shared";
import { ApiRequestError, importNevoFood, searchNevoFoods, updateNutritionRecipeItem } from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Field } from "../../../src/components/Field";
import { Screen } from "../../../src/components/Screen";
import { tokens } from "../../../src/theme/tokens";

export default function NevoSearchScreen() {
  const params = useLocalSearchParams<{ q?: string; recipeId?: string; itemId?: string }>();
  const recipeId = Array.isArray(params.recipeId) ? params.recipeId[0] : params.recipeId;
  const itemId = Array.isArray(params.itemId) ? params.itemId[0] : params.itemId;
  const initialQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const [query, setQuery] = useState(initialQuery ?? "");
  const [hits, setHits] = useState<NevoFoodHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSearch(nextQuery = query) {
    setLoading(true);
    setError(null);
    try {
      const live = await searchNevoFoods(nextQuery);
      setHits(live.foods);
      if (live.foods.length === 0) {
        setError('Geen match. Probeer “halfvolle melk” of “havermout”.');
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not search NEVO.");
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
    void searchNevoFoods(q)
      .then((live) => {
        if (cancelled) return;
        setHits(live.foods);
        if (live.foods.length === 0) {
          setError('Geen match. Probeer “halfvolle melk” of “havermout”.');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiRequestError ? err.message : "Could not search NEVO.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialQuery]);

  async function onImport(hit: NevoFoodHit) {
    setImportingId(hit.nevoCode);
    setError(null);
    try {
      const saved = await importNevoFood(hit.nevoCode, hit.name);
      if (recipeId && itemId) {
        await updateNutritionRecipeItem(recipeId, itemId, { foodId: saved.food.id });
      }
      router.back();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not import that food.");
    } finally {
      setImportingId(null);
    }
  }

  return (
    <Screen>
      <AppText variant="display">NEVO search</AppText>
      <AppText variant="body" color="muted">
        Dutch reference foods per 100 g. Save one to My foods, then log grams in the diary.
      </AppText>
      <Field label="Food" value={query} onChangeText={setQuery} placeholder="halfvolle melk" variant="search" />
      <Button size="compact" label="Search" onPress={() => void onSearch()} loading={loading} />
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      {hits.map((hit) => (
        <Pressable
          key={hit.nevoCode}
          onPress={() => void onImport(hit)}
          disabled={importingId != null}
          style={styles.hit}
          accessibilityRole="button"
          accessibilityLabel={`Import ${hit.name}`}
        >
          <View style={styles.copy}>
            <AppText variant="title">{hit.name}</AppText>
            <AppText variant="caption" color="muted">
              {hit.foodGroup}
              {hit.nameEn ? ` · ${hit.nameEn}` : ""}
            </AppText>
          </View>
          <AppText variant="caption" color="accent">
            {importingId === hit.nevoCode ? "Saving…" : "Save"}
          </AppText>
        </Pressable>
      ))}
      <AppText variant="caption" color="muted">
        {NEVO_ATTRIBUTION}
      </AppText>
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
