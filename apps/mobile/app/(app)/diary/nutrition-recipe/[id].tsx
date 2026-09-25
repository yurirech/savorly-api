import { type Href, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { UserFood } from "@savorly/shared";
import {
  addNutritionRecipeItem,
  ApiRequestError,
  deleteNutritionRecipeItem,
  fetchNutritionRecipe,
  listNutritionFoods,
  publishNutritionRecipe,
  updateNutritionRecipe,
  updateNutritionRecipeItem,
  type NutritionRecipeDetail,
} from "../../../../src/api/client";
import { AppText } from "../../../../src/components/AppText";
import { Button } from "../../../../src/components/Button";
import { Field } from "../../../../src/components/Field";
import { Screen } from "../../../../src/components/Screen";
import { tokens } from "../../../../src/theme/tokens";

export default function NutritionRecipeScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [detail, setDetail] = useState<NutritionRecipeDetail | null>(null);
  const [foods, setFoods] = useState<UserFood[]>([]);
  const [pickingItemId, setPickingItemId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addFoodId, setAddFoodId] = useState<string | null>(null);
  const [addGrams, setAddGrams] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!id) return;
    const [live, library] = await Promise.all([fetchNutritionRecipe(id), listNutritionFoods()]);
    setDetail(live);
    setFoods(library.foods.filter((food) => food.source !== "recipe"));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void reload().catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "Could not load recipe copy.");
      });
    }, [reload]),
  );

  async function run(action: () => Promise<NutritionRecipeDetail>) {
    setSaving(true);
    setError(null);
    try {
      setDetail(await action());
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not update recipe copy.");
    } finally {
      setSaving(false);
    }
  }

  const libraryFoods = foods;

  return (
    <Screen>
      <AppText variant="display">{detail?.title ?? "Recipe copy"}</AppText>
      <AppText variant="body" color="muted">
        Match every ingredient to a food in My foods, or delete the line. You can add extras.
      </AppText>
      {detail ? (
        <>
          <Field
            label="Servings"
            value={String(detail.servings)}
            keyboardType="numeric"
            onChangeText={(value) => {
              const servings = Number(value);
              if (Number.isInteger(servings) && servings >= 1) {
                void run(() => updateNutritionRecipe(detail.id, { servings }));
              }
            }}
          />
          <Field
            label="Cooked weight g (optional)"
            value={detail.cookedWeightG != null ? String(detail.cookedWeightG) : ""}
            keyboardType="numeric"
            placeholder={String(detail.ingredientGramsTotal || "")}
            onChangeText={(value) => {
              const trimmed = value.trim();
              const cookedWeightG = trimmed ? Number(trimmed.replace(",", ".")) : null;
              if (cookedWeightG == null || cookedWeightG > 0) {
                void run(() => updateNutritionRecipe(detail.id, { cookedWeightG }));
              }
            }}
          />
          {detail.items.map((item) => (
            <View key={item.id} style={styles.line}>
              <AppText variant="title">{item.foodName || item.sourceLine}</AppText>
              <AppText variant="caption" color="muted">
                {item.foodId ? `${item.grams ?? "—"} g` : "Not matched"}
              </AppText>
              <Field
                label="Grams"
                value={item.grams != null ? String(item.grams) : ""}
                keyboardType="numeric"
                onChangeText={(value) => {
                  const grams = Number(value.replace(",", "."));
                  if (grams > 0) {
                    void run(() => updateNutritionRecipeItem(detail.id, item.id, { grams }));
                  }
                }}
              />
              <Button label="Find food" variant="secondary" onPress={() => setPickingItemId(item.id)} />
              <Button
                label="Delete line"
                variant="ghost"
                onPress={() => void run(() => deleteNutritionRecipeItem(detail.id, item.id))}
              />
            </View>
          ))}
          <Button label="Add ingredient" variant="secondary" onPress={() => setAdding(true)} />
          {pickingItemId || adding ? (
            <View style={styles.picker}>
              {libraryFoods.map((food) => (
                <Pressable
                  key={food.id}
                  style={styles.food}
                  onPress={() => {
                    if (pickingItemId) {
                      void run(() => updateNutritionRecipeItem(detail.id, pickingItemId, { foodId: food.id }));
                      setPickingItemId(null);
                      return;
                    }
                    setAddFoodId(food.id);
                  }}
                >
                  <AppText variant="body">{food.name}</AppText>
                </Pressable>
              ))}
              {adding ? (
                <>
                  <Field label="Grams for extra" value={addGrams} onChangeText={setAddGrams} keyboardType="numeric" />
                  <Button
                    label="Add selected food"
                    onPress={() => {
                      const grams = Number(addGrams.replace(",", "."));
                      if (!addFoodId || !(grams > 0)) {
                        setError("Pick a food and grams.");
                        return;
                      }
                      void run(() => addNutritionRecipeItem(detail.id, addFoodId, grams)).then(() => {
                        setAdding(false);
                        setAddFoodId(null);
                        setAddGrams("");
                      });
                    }}
                  />
                </>
              ) : null}
            </View>
          ) : null}
          <AppText variant="caption" color="muted">
            {detail.complete
              ? `${detail.totals.kcal} kcal · ${detail.perServing.kcal} kcal / serving · ${detail.recipeWeightG} g`
              : "Match or delete every line before saving to My foods."}
          </AppText>
          <Button
            label="Save to My foods"
            loading={saving}
            disabled={!detail.complete}
            onPress={() =>
              void run(async () => {
                const saved = await publishNutritionRecipe(detail.id);
                if (saved.libraryFood) {
                  router.push(`/(app)/diary/food/${saved.libraryFood.id}` as Href);
                }
                return saved;
              })
            }
          />
          {detail.libraryFood ? (
            <Button
              label="Open saved copy"
              variant="secondary"
              onPress={() => router.push(`/(app)/diary/food/${detail.libraryFood!.id}` as Href)}
            />
          ) : null}
        </>
      ) : null}
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: {
    gap: tokens.space.xs,
    padding: tokens.space.md,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radius.md,
  },
  picker: { gap: tokens.space.sm },
  food: {
    padding: tokens.space.sm,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radius.md,
  },
});
