import { type Href, router } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { FoodCategory, MealSuggestion } from "@savorly/shared";
import { ApiRequestError, fetchMealSuggestion } from "../../src/api/client";
import { AppText } from "../../src/components/AppText";
import { Button } from "../../src/components/Button";
import { CategoryPicker } from "../../src/components/CategoryPicker";
import { RecipeCard } from "../../src/components/RecipeCard";
import { Screen } from "../../src/components/Screen";
import { tokens } from "../../src/theme/tokens";

const MISSING_PREVIEW_LIMIT = 8;

type SuggestPhase = "category" | "result";

export default function SuggestMealScreen() {
  const [phase, setPhase] = useState<SuggestPhase>("category");
  const [category, setCategory] = useState<FoodCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<MealSuggestion | null>(null);
  const [rankedTotal, setRankedTotal] = useState(0);
  const [shownRecipeIds, setShownRecipeIds] = useState<string[]>([]);
  const [emptyKind, setEmptyKind] = useState<"no_recipes" | "no_match" | null>(null);

  const loadSuggestion = useCallback(
    async (nextCategory: FoodCategory | null, excludeIds: string[]) => {
      setLoading(true);
      setError(null);
      setEmptyKind(null);
      try {
        const response = await fetchMealSuggestion({
          category: nextCategory ?? undefined,
          excludeIds,
        });
        setRankedTotal(response.rankedTotal);
        setSuggestion(response.suggestion);
        if (response.suggestion) {
          setShownRecipeIds((current) =>
            current.includes(response.suggestion!.recipe.id) ? current : [...current, response.suggestion!.recipe.id],
          );
          setEmptyKind(null);
        } else if (response.rankedTotal === 0) {
          setEmptyKind(excludeIds.length > 0 ? "no_match" : "no_recipes");
        } else {
          setEmptyKind("no_match");
        }
        setPhase("result");
      } catch (err) {
        if (err instanceof ApiRequestError && err.code === "validation_error") {
          setError(err.message);
          setPhase("result");
          setSuggestion(null);
          return;
        }
        setError(err instanceof ApiRequestError ? err.message : "Could not suggest a meal.");
        setPhase("result");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  function onContinue() {
    setShownRecipeIds([]);
    void loadSuggestion(category, []);
  }

  function onShowAnother() {
    if (!suggestion) {
      return;
    }
    const exclude = [...shownRecipeIds];
    void loadSuggestion(category, exclude);
  }

  function onChangeCategory() {
    setPhase("category");
    setSuggestion(null);
    setError(null);
    setEmptyKind(null);
    setShownRecipeIds([]);
  }

  const missingPreview = suggestion?.missingIngredients.slice(0, MISSING_PREVIEW_LIMIT) ?? [];
  const missingOverflow =
    suggestion && suggestion.missingIngredients.length > MISSING_PREVIEW_LIMIT
      ? suggestion.missingIngredients.length - MISSING_PREVIEW_LIMIT
      : 0;

  return (
    <Screen>
      {phase === "category" ? (
        <View style={styles.block}>
          <AppText variant="title">What are you in the mood for?</AppText>
          <AppText variant="body" color="muted">
            Pick a category or choose Any to search all saved recipes.
          </AppText>
          <CategoryPicker value={category} onChange={setCategory} includeAny />
          <Button label="Continue" onPress={onContinue} loading={loading} />
        </View>
      ) : null}

      {phase === "result" ? (
        <View style={styles.block}>
          {loading ? (
            <AppText variant="body" color="muted">
              Finding a match from your pantry…
            </AppText>
          ) : null}

          {error ? (
            <View style={styles.messageBlock}>
              <AppText variant="body" color="danger">
                {error}
              </AppText>
              {error.includes("pantry") ? (
                <Button label="Open pantry" variant="secondary" onPress={() => router.push("/(app)/(tabs)/pantry" as Href)} />
              ) : null}
            </View>
          ) : null}

          {!loading && !error && suggestion ? (
            <>
              <AppText variant="label" color="muted">
                Top pick
              </AppText>
              <RecipeCard
                recipe={suggestion.recipe}
                onPress={() => router.push(`/(app)/recipe/${suggestion.recipe.id}`)}
              />
              <AppText variant="body">
                You have {suggestion.matchedCount} of {suggestion.totalCount} ingredients
              </AppText>
              {missingPreview.length > 0 ? (
                <View style={styles.missingBlock}>
                  <AppText variant="label" color="muted">
                    Missing
                  </AppText>
                  <AppText variant="body" color="muted" numberOfLines={4}>
                    {missingPreview.join(" · ")}
                    {missingOverflow > 0 ? ` · +${missingOverflow} more` : ""}
                  </AppText>
                </View>
              ) : null}
              <Button label="Open recipe" onPress={() => router.push(`/(app)/recipe/${suggestion.recipe.id}`)} />
              {rankedTotal > 1 ? (
                <Button label="Show another" variant="secondary" onPress={onShowAnother} disabled={loading} />
              ) : null}
            </>
          ) : null}

          {!loading && !error && !suggestion && emptyKind === "no_recipes" ? (
            <View style={styles.messageBlock}>
              <AppText variant="body" color="muted">
                No saved recipes in this category yet. Import or create one first.
              </AppText>
              <Button label="Go to recipes" variant="secondary" onPress={() => router.push("/(app)/(tabs)/recipes" as Href)} />
            </View>
          ) : null}

          {!loading && !error && !suggestion && emptyKind === "no_match" ? (
            <View style={styles.messageBlock}>
              <AppText variant="body" color="muted">
                Nothing in your cookbook matches your pantry well enough yet. Try another category or add more staples.
              </AppText>
            </View>
          ) : null}

          <Button label="Change category" variant="ghost" onPress={onChangeCategory} disabled={loading} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: tokens.space.md,
  },
  messageBlock: {
    gap: tokens.space.sm,
  },
  missingBlock: {
    gap: tokens.space.xs,
  },
});
