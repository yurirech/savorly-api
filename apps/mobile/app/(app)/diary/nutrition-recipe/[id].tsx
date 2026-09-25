import { type Href, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
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
  const [gramDrafts, setGramDrafts] = useState<Record<string, string>>({});
  const [servingsDraft, setServingsDraft] = useState<string | null>(null);
  const [cookedDraft, setCookedDraft] = useState<string | null>(null);

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

  function commitGrams(itemId: string, currentGrams: number | null, text: string) {
    const grams = Number(text.replace(",", "."));
    setGramDrafts((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
    if (!detail || !(grams > 0) || grams === currentGrams) return;
    void run(() => updateNutritionRecipeItem(detail.id, itemId, { grams }));
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
          <View style={styles.meta}>
            <View style={styles.metaField}>
              <AppText variant="caption" color="muted">Servings</AppText>
              <TextInput
                value={servingsDraft ?? String(detail.servings)}
                keyboardType="numeric"
                accessibilityLabel="Servings"
                onChangeText={setServingsDraft}
                onEndEditing={(event) => {
                  setServingsDraft(null);
                  const servings = Number(event.nativeEvent.text);
                  if (Number.isInteger(servings) && servings >= 1 && servings !== detail.servings) {
                    void run(() => updateNutritionRecipe(detail.id, { servings }));
                  }
                }}
                onBlur={(event) => {
                  setServingsDraft(null);
                  const servings = Number(event.nativeEvent.text);
                  if (Number.isInteger(servings) && servings >= 1 && servings !== detail.servings) {
                    void run(() => updateNutritionRecipe(detail.id, { servings }));
                  }
                }}
                style={styles.metaInput}
              />
            </View>
            <View style={styles.metaField}>
              <AppText variant="caption" color="muted">Cooked weight g</AppText>
              <TextInput
                value={cookedDraft ?? (detail.cookedWeightG != null ? String(detail.cookedWeightG) : "")}
                keyboardType="numeric"
                placeholder={String(detail.ingredientGramsTotal || "")}
                placeholderTextColor={tokens.textMuted}
                accessibilityLabel="Cooked weight g"
                onChangeText={setCookedDraft}
                onEndEditing={(event) => {
                  setCookedDraft(null);
                  const trimmed = event.nativeEvent.text.trim();
                  const cookedWeightG = trimmed ? Number(trimmed.replace(",", ".")) : null;
                  if ((cookedWeightG == null || cookedWeightG > 0) && cookedWeightG !== detail.cookedWeightG) {
                    void run(() => updateNutritionRecipe(detail.id, { cookedWeightG }));
                  }
                }}
                onBlur={(event) => {
                  setCookedDraft(null);
                  const trimmed = event.nativeEvent.text.trim();
                  const cookedWeightG = trimmed ? Number(trimmed.replace(",", ".")) : null;
                  if ((cookedWeightG == null || cookedWeightG > 0) && cookedWeightG !== detail.cookedWeightG) {
                    void run(() => updateNutritionRecipe(detail.id, { cookedWeightG }));
                  }
                }}
                style={styles.metaInput}
              />
            </View>
          </View>
          <View style={styles.list}>
            {detail.items.map((item) => (
              <View key={item.id} style={styles.row}>
                <AppText variant="body" numberOfLines={1} color={item.foodId ? "text" : "muted"} style={styles.name}>
                  {item.foodName || item.sourceLine}
                </AppText>
                <TextInput
                  value={gramDrafts[item.id] ?? (item.grams != null ? String(item.grams) : "")}
                  keyboardType="numeric"
                  accessibilityLabel={`Grams for ${item.foodName || item.sourceLine}`}
                  onChangeText={(value) => setGramDrafts((current) => ({ ...current, [item.id]: value }))}
                  onEndEditing={(event) => commitGrams(item.id, item.grams, event.nativeEvent.text)}
                  onBlur={(event) => commitGrams(item.id, item.grams, event.nativeEvent.text)}
                  style={styles.grams}
                />
                <Pressable onPress={() => setPickingItemId(item.id)} hitSlop={8} accessibilityRole="button">
                  <AppText variant="caption" color="accent">Find</AppText>
                </Pressable>
                <Pressable
                  onPress={() => void run(() => deleteNutritionRecipeItem(detail.id, item.id))}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <AppText variant="caption" color="danger">Delete</AppText>
                </Pressable>
              </View>
            ))}
          </View>
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
  meta: {
    flexDirection: "row",
    gap: tokens.space.sm,
  },
  metaField: {
    flex: 1,
    gap: tokens.space.xs,
  },
  metaInput: {
    color: tokens.text,
    fontSize: tokens.type.body.fontSize,
    fontFamily: tokens.font.body,
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    minHeight: 36,
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: tokens.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingVertical: tokens.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  },
  name: {
    flex: 1,
  },
  grams: {
    width: 64,
    color: tokens.text,
    fontSize: tokens.type.body.fontSize,
    fontFamily: tokens.font.body,
    textAlign: "right",
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    minHeight: 32,
  },
  picker: { gap: tokens.space.xs },
  food: {
    paddingVertical: tokens.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  },
});
