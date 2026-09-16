import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import type { CookbookSummary, SavedRecipe } from "@savorly/shared";
import { getRecipe, listCookbooks, listRecipeCookbooks, setRecipeCookbooks } from "../../../src/api/client";
import { imageForCategory } from "../../../src/assets/categoryImages";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { CookbookPickerSheet } from "../../../src/components/CookbookPickerSheet";
import { Screen } from "../../../src/components/Screen";
import { getCachedRecipe } from "../../../src/db/cache";
import { setReviewDraft } from "../../../src/store/reviewDraft";
import { tokens } from "../../../src/theme/tokens";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<SavedRecipe | null>(null);
  const [cookbooks, setCookbooks] = useState<CookbookSummary[]>([]);
  const [savedCookbookIds, setSavedCookbookIds] = useState<string[]>([]);
  const [selectedCookbookIds, setSelectedCookbookIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingCookbooks, setSavingCookbooks] = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      void getCachedRecipe(id).then((cached) => {
        if (cached) setRecipe(cached);
      });
      try {
        const live = await getRecipe(id);
        setRecipe(live.recipe);
      } catch {
        // Cached recipe is enough offline.
      }
      try {
        const [books, membership] = await Promise.all([listCookbooks(), listRecipeCookbooks(id)]);
        setCookbooks(books.cookbooks);
        setSavedCookbookIds(membership.cookbookIds);
        setSelectedCookbookIds(membership.cookbookIds);
      } catch {
        // Membership is live-only.
      }
    })();
  }, [id]);

  if (!recipe) {
    return (
      <Screen>
        <AppText variant="body" color="muted">
          Loading recipe…
        </AppText>
      </Screen>
    );
  }

  return (
    <>
    <Screen padded={false} edges={[]}>
      <View style={styles.heroWrap}>
        <Image source={imageForCategory(recipe.category)} style={styles.hero} />
        <View style={styles.heroScrim} />
        <View style={styles.heroCopy}>
          <AppText variant="label" color="accent">
            {recipe.category}
          </AppText>
          <AppText variant="display">{recipe.title}</AppText>
          <AppText variant="caption" color="muted">
            {recipe.source.author || recipe.source.sourceName || recipe.source.type}
          </AppText>
        </View>
      </View>
      <View style={styles.body}>
        <AppText variant="title">Ingredients</AppText>
        {recipe.ingredients.map((ingredient) => (
          <View key={ingredient.name} style={styles.ingredient}>
            <AppText variant="body">
              {[ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(" ")}
            </AppText>
          </View>
        ))}
        <AppText variant="title">Steps</AppText>
        {recipe.steps.map((step) => (
          <View key={step.order} style={styles.step}>
            <View style={styles.stepIndex}>
              <AppText variant="label" color="accent">
                {String(step.order).padStart(2, "0")}
              </AppText>
            </View>
            <AppText variant="body" style={styles.stepText}>
              {step.text}
            </AppText>
          </View>
        ))}
        {recipe.uncertainties.length > 0 ? (
          <View style={styles.box}>
            <AppText variant="title">Uncertainties</AppText>
            {recipe.uncertainties.map((item) => (
              <AppText key={item} variant="body" color="muted">
                {item}
              </AppText>
            ))}
          </View>
        ) : null}
        <Button
          label="Add to cookbooks"
          variant="secondary"
          onPress={() => {
            setSelectedCookbookIds(savedCookbookIds);
            setPickerOpen(true);
          }}
        />
        <Button
          label="Edit"
          variant="secondary"
          onPress={() => {
            setReviewDraft(recipe, recipe.id);
            router.push("/(app)/review");
          }}
        />
      </View>
    </Screen>
      <CookbookPickerSheet
        visible={pickerOpen}
        cookbooks={cookbooks}
        selectedIds={selectedCookbookIds}
        saving={savingCookbooks}
        onToggle={(cookbookId) =>
          setSelectedCookbookIds((current) =>
            current.includes(cookbookId) ? current.filter((value) => value !== cookbookId) : [...current, cookbookId],
          )
        }
        onClose={() => {
          setSelectedCookbookIds(savedCookbookIds);
          setPickerOpen(false);
        }}
        onSave={() => {
          void (async () => {
            setSavingCookbooks(true);
            try {
              const saved = await setRecipeCookbooks(recipe.id, selectedCookbookIds);
              setSavedCookbookIds(saved.cookbookIds);
              setSelectedCookbookIds(saved.cookbookIds);
              setPickerOpen(false);
            } finally {
              setSavingCookbooks(false);
            }
          })();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    height: 320,
    justifyContent: "flex-end",
  },
  hero: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  heroScrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: tokens.bg,
    opacity: 0.4,
  },
  heroCopy: {
    padding: tokens.space.lg,
    paddingBottom: tokens.space.xl,
    gap: tokens.space.sm,
  },
  body: {
    padding: tokens.space.lg,
    gap: tokens.space.md,
  },
  ingredient: {
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
    paddingVertical: tokens.space.sm,
  },
  step: {
    flexDirection: "row",
    gap: tokens.space.md,
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    borderWidth: 1,
    borderColor: tokens.border,
  },
  stepIndex: {
    width: 32,
  },
  stepText: {
    flex: 1,
  },
  box: {
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    gap: tokens.space.sm,
    borderWidth: 1,
    borderColor: tokens.border,
  },
});
