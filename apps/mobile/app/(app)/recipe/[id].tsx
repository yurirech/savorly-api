import { router, type Href, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Check, Copy, Minus, Plus } from "phosphor-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CookbookSummary, DisplayUnit, PantrySubstitutionResponse, SavedRecipe } from "@savorly/shared";
import {
  displayIngredient,
  formatIngredientLine,
  formatRecipeIngredientsCopy,
  isCreamiRecipe,
  recipeNotesText,
} from "@savorly/shared";
import { deleteRecipe, getRecipe, listCookbooks, listRecipeCookbooks, requestPantrySubstitutions, setRecipeCookbooks, updateRecipe, ApiRequestError } from "../../../src/api/client";
import { imageForCategory } from "../../../src/assets/categoryImages";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { CookbookPickerSheet } from "../../../src/components/CookbookPickerSheet";
import { Field } from "../../../src/components/Field";
import { RecipeIngredientLine } from "../../../src/components/RecipeIngredientLine";
import { RecipePantryMissingSheet } from "../../../src/components/RecipePantryMissingSheet";
import { RecipePantryStatus } from "../../../src/components/RecipePantryStatus";
import { RecipePantrySubstitutionsSheet } from "../../../src/components/RecipePantrySubstitutionsSheet";
import { RecipeNutritionSummary } from "../../../src/components/RecipeNutritionSummary";
import { Screen } from "../../../src/components/Screen";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import { softWrapText } from "../../../src/utils/textWrap";
import { getCachedRecipe, removeCachedRecipe, upsertCachedRecipe } from "../../../src/db/cache";
import { useRecipePantry } from "../../../src/hooks/useRecipePantry";
import { setReviewDraft } from "../../../src/store/reviewDraft";
import { tokens } from "../../../src/theme/tokens";
import { confirmDestructive } from "../../../src/utils/confirmDestructive";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<SavedRecipe | null>(null);
  const [cookbooks, setCookbooks] = useState<CookbookSummary[]>([]);
  const [savedCookbookIds, setSavedCookbookIds] = useState<string[]>([]);
  const [selectedCookbookIds, setSelectedCookbookIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerOpenRef = useRef(false);
  pickerOpenRef.current = pickerOpen;
  const [savingCookbooks, setSavingCookbooks] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [displayServings, setDisplayServings] = useState<number | null>(null);
  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>("original");
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [missingSheetOpen, setMissingSheetOpen] = useState(false);
  const [substitutionsSheetOpen, setSubstitutionsSheetOpen] = useState(false);
  const [substitutionResult, setSubstitutionResult] = useState<PantrySubstitutionResponse | null>(null);
  const [substitutionError, setSubstitutionError] = useState<string | null>(null);
  const [suggestingSwaps, setSuggestingSwaps] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const {
    match: pantryMatch,
    loading: pantryLoading,
    activeStapleCount,
    addingIndex,
    reloadPantry,
    quickAddIngredient,
    pantryError: pantryLoadError,
  } = useRecipePantry(recipe);

  const recipeId = Array.isArray(id) ? id[0] : id;

  const reloadRecipe = useCallback(async () => {
    if (!recipeId) return;
    void getCachedRecipe(recipeId).then((cached) => {
      if (cached) setRecipe(cached);
    });
    try {
      const live = await getRecipe(recipeId);
      setRecipe(live.recipe);
    } catch {
      // Cached recipe is enough offline.
    }
  }, [recipeId]);

  const reloadCookbooks = useCallback(async () => {
    if (!recipeId) return;
    try {
      const books = await listCookbooks();
      setCookbooks(Array.isArray(books.cookbooks) ? books.cookbooks : []);
    } catch {
      // Picker can still use local list.
    }
    try {
      const membership = await listRecipeCookbooks(recipeId);
      setSavedCookbookIds(membership.cookbookIds);
      if (!pickerOpenRef.current) {
        setSelectedCookbookIds(membership.cookbookIds);
      }
    } catch {
      // Membership is live-only.
    }
  }, [recipeId]);

  useFocusEffect(
    useCallback(() => {
      if (!recipeId) return;
      void reloadRecipe();
      void reloadCookbooks();
      void reloadPantry();
    }, [recipeId, reloadRecipe, reloadCookbooks, reloadPantry]),
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([reloadRecipe(), reloadCookbooks(), reloadPantry()]);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    setDisplayServings(null);
    setDisplayUnit("original");
  }, [id]);

  async function persistMembership(nextIds: string[]) {
    if (!recipeId) return;
    setSelectedCookbookIds(nextIds);
    setSavingCookbooks(true);
    setError(null);
    try {
      const saved = await setRecipeCookbooks(recipeId, nextIds);
      setSavedCookbookIds(saved.cookbookIds);
      setSelectedCookbookIds(saved.cookbookIds);
      try {
        const books = await listCookbooks();
        setCookbooks(books.cookbooks);
      } catch {
        // Chips can still render from the local list.
      }
    } catch (err) {
      setSelectedCookbookIds(savedCookbookIds);
      setError(err instanceof Error ? err.message : "Could not update cookbooks.");
    } finally {
      setSavingCookbooks(false);
    }
  }

  const notesSource = recipe ? recipeNotesText(recipe) : "";

  useEffect(() => {
    setNotesDraft(notesSource);
  }, [id, notesSource]);

  useEffect(() => {
    if (!recipe) return;
    setDisplayServings((current) => current ?? recipe.servings ?? null);
  }, [recipe]);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) {
        clearTimeout(copiedTimer.current);
      }
    };
  }, []);

  if (!recipe) {
    return (
      <Screen>
        <AppText variant="body" color="muted">
          Loading recipe…
        </AppText>
      </Screen>
    );
  }

  const canScale = recipe.servings != null && recipe.servings > 0;
  const servingsForMath = canScale ? (displayServings ?? recipe.servings ?? 1) : 1;
  const shownIngredients = recipe.ingredients.map((ingredient) =>
    displayIngredient(ingredient, {
      originalServings: recipe.servings,
      displayServings: servingsForMath,
      displayUnit,
    }),
  );

  async function saveNotes() {
    const nextNotes = notesDraft.trim() || null;
    const current = recipeNotesText(recipe).trim() || null;
    if (nextNotes === current) return;
    try {
      const saved = await updateRecipe(recipe.id, {
        ...recipe,
        notes: nextNotes,
        uncertainties: [],
      });
      void upsertCachedRecipe(saved.recipe);
      setRecipe(saved.recipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save notes.");
    }
  }

  function confirmDelete() {
    confirmDestructive(
      "Delete recipe?",
      "This removes it from your library and cookbooks.",
      "Delete",
      () => {
        void (async () => {
          setDeleting(true);
          setError(null);
          try {
            await deleteRecipe(recipe.id);
            void removeCachedRecipe(recipe.id);
            router.replace("/(app)/(tabs)/recipes" as Href);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not delete this recipe.");
            setDeleting(false);
          }
        })();
      },
    );
  }

  async function copyIngredients() {
    await Clipboard.setStringAsync(formatRecipeIngredientsCopy(recipe.title, shownIngredients));
    setCopied(true);
    if (copiedTimer.current) {
      clearTimeout(copiedTimer.current);
    }
    copiedTimer.current = setTimeout(() => setCopied(false), 1500);
  }

  async function suggestPantrySwaps() {
    setSuggestingSwaps(true);
    setSubstitutionError(null);
    setSubstitutionResult(null);
    try {
      const result = await requestPantrySubstitutions(recipe.id, {
        displayServings: canScale ? servingsForMath : undefined,
      });
      setSubstitutionResult(result);
      setMissingSheetOpen(false);
      setSubstitutionsSheetOpen(true);
    } catch (err) {
      setSubstitutionError(err instanceof ApiRequestError ? err.message : "Could not suggest swaps.");
      setSubstitutionsSheetOpen(true);
    } finally {
      setSuggestingSwaps(false);
    }
  }

  function applyPantrySwaps() {
    if (!substitutionResult) {
      return;
    }
    setReviewDraft(substitutionResult.adaptedRecipe, recipe.id);
    setSubstitutionsSheetOpen(false);
    router.push("/(app)/review");
  }

  const showPantryOnIngredients = activeStapleCount > 0 && !pantryLoading;
  const pantryRowByIndex = new Map(pantryMatch?.ingredients.map((row) => [row.index, row]) ?? []);

  return (
    <>
    <Screen padded={false} edges={[]} safeBottom={false} onRefresh={() => void onRefresh()} refreshing={refreshing}>
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
      <View style={[styles.body, { paddingBottom: tokens.space.lg + insets.bottom }]}>
        <View style={styles.scaleRow}>
          <AppText variant="label" color="muted">
            Servings
          </AppText>
          {canScale ? (
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setDisplayServings(Math.max(1, servingsForMath - 1))}
                style={styles.stepperBtn}
                accessibilityRole="button"
                accessibilityLabel="Fewer servings"
              >
                <Minus size={18} color={tokens.text} />
              </Pressable>
              <AppText variant="title">{String(servingsForMath)}</AppText>
              <Pressable
                onPress={() => setDisplayServings(servingsForMath + 1)}
                style={styles.stepperBtn}
                accessibilityRole="button"
                accessibilityLabel="More servings"
              >
                <Plus size={18} color={tokens.text} />
              </Pressable>
            </View>
          ) : (
            <AppText variant="body" color="muted">
              Servings not set
            </AppText>
          )}
          {canScale && recipe.servings != null && servingsForMath !== recipe.servings ? (
            <AppText variant="caption" color="muted">
              Scaled from {recipe.servings}
            </AppText>
          ) : null}
        </View>
        <SegmentedControl
          value={displayUnit}
          onChange={setDisplayUnit}
          options={[
            { value: "original", label: "Original" },
            { value: "g", label: "g" },
            { value: "volume", label: "cups" },
          ]}
        />
        <View style={styles.ingredientsBlock}>
          <View style={styles.ingredientsHeader}>
            <AppText variant="title">Ingredients</AppText>
            <Pressable
              onPress={() => void copyIngredients()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Copy ingredients"
            >
              {copied ? <Check size={18} color={tokens.accent} /> : <Copy size={18} color={tokens.textMuted} />}
            </Pressable>
          </View>
          <RecipePantryStatus
            match={pantryMatch}
            loading={pantryLoading}
            hasStaples={activeStapleCount > 0}
            onPressMissing={() => setMissingSheetOpen(true)}
          />
        </View>
        {pantryLoadError ? (
          <AppText variant="caption" color="danger">
            {pantryLoadError}
          </AppText>
        ) : null}
        {recipe.ingredients.map((ingredient, index) => {
          const shown = shownIngredients[index];
          if (!shown) return null;
          const pantryRow = pantryRowByIndex.get(index);
          return (
            <View key={`${index}-${ingredient.name}`} style={styles.ingredient}>
              <RecipeIngredientLine
                ingredient={ingredient}
                line={formatIngredientLine(shown)}
                showPantryActions={showPantryOnIngredients}
                pantryMatched={pantryRow?.matched}
                quickAddLoading={addingIndex === index}
                onQuickAdd={
                  pantryRow && !pantryRow.matched
                    ? () => void quickAddIngredient(pantryRow)
                    : undefined
                }
              />
            </View>
          );
        })}
        {!isCreamiRecipe(recipe) && recipe.steps.length > 0 ? (
          <>
            <AppText variant="title">Steps</AppText>
            {recipe.steps.map((step) => (
              <View key={step.order} style={styles.step}>
                <View style={styles.stepIndex}>
                  <AppText variant="label" color="accent">
                    {String(step.order).padStart(2, "0")}
                  </AppText>
                </View>
                <AppText variant="body" style={styles.stepText}>
                  {softWrapText(step.text)}
                </AppText>
              </View>
            ))}
          </>
        ) : null}
        <RecipeNutritionSummary nutrition={recipe.nutrition} />
        <Field
          label="Notes"
          value={notesDraft}
          onChangeText={setNotesDraft}
          onEndEditing={() => void saveNotes()}
          multiline
          placeholder="Anything you want to remember"
        />
        {savedCookbookIds.length > 0 ? (
          <View style={styles.cookbookBlock}>
            <AppText variant="label" color="muted">
              Cookbooks
            </AppText>
            <View style={styles.chipRow}>
              {savedCookbookIds.map((bookId) => {
                const book = cookbooks.find((item) => item.id === bookId);
                return (
                  <Pressable
                    key={bookId}
                    onPress={() => router.push(`/(app)/cookbook/${bookId}` as Href)}
                    style={styles.chip}
                  >
                    <AppText variant="caption">{book?.name ?? "Cookbook"}</AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
        <Button
          label={savedCookbookIds.length > 0 ? "Edit cookbooks" : "Add to cookbooks"}
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
        {error ? (
          <AppText variant="body" color="danger">
            {error}
          </AppText>
        ) : null}
        <Button label="Delete recipe" variant="ghost" onPress={confirmDelete} loading={deleting} disabled={deleting} />
      </View>
    </Screen>
      <CookbookPickerSheet
        visible={pickerOpen}
        cookbooks={cookbooks}
        selectedIds={selectedCookbookIds}
        saving={savingCookbooks}
        onToggle={(cookbookId) => {
          const nextIds = selectedCookbookIds.includes(cookbookId)
            ? selectedCookbookIds.filter((value) => value !== cookbookId)
            : [...selectedCookbookIds, cookbookId];
          void persistMembership(nextIds);
        }}
        onCreated={(book) => {
          setCookbooks((current) => [book, ...current.filter((item) => item.id !== book.id)]);
          const nextIds = selectedCookbookIds.includes(book.id)
            ? selectedCookbookIds
            : [...selectedCookbookIds, book.id];
          void persistMembership(nextIds);
        }}
        onClose={() => {
          setSelectedCookbookIds(savedCookbookIds);
          setPickerOpen(false);
        }}
        onSave={() => setPickerOpen(false)}
      />
      <RecipePantryMissingSheet
        visible={missingSheetOpen}
        match={pantryMatch}
        addingIndex={addingIndex}
        suggesting={suggestingSwaps}
        onClose={() => setMissingSheetOpen(false)}
        onQuickAdd={(row) => void quickAddIngredient(row)}
        onSuggestSwaps={() => void suggestPantrySwaps()}
      />
      <RecipePantrySubstitutionsSheet
        visible={substitutionsSheetOpen}
        result={substitutionResult}
        error={substitutionError}
        applying={false}
        onClose={() => {
          setSubstitutionsSheetOpen(false);
          setSubstitutionError(null);
        }}
        onApply={applyPantrySwaps}
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
  scaleRow: {
    gap: tokens.space.sm,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  ingredient: {
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
    paddingVertical: tokens.space.sm,
  },
  ingredientsBlock: {
    gap: tokens.space.sm,
  },
  ingredientsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.sm,
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
    minWidth: 0,
  },
  cookbookBlock: {
    gap: tokens.space.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
  },
  chip: {
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.border,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    backgroundColor: tokens.surface,
  },
});
