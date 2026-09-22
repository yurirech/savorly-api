import { useCallback, useMemo, useState } from "react";
import {
  activePantryStapleCount,
  buildPantryMatchIndex,
  evaluateRecipePantryMatch,
  type PantryResponse,
  type RecipePantryIngredientStatus,
  type RecipePantryMatchResult,
  type SavedRecipe,
} from "@savorly/shared";
import {
  ApiRequestError,
  createPantryItem,
  fetchPantry,
  setStarterInPantry,
} from "../api/client";

export function useRecipePantry(recipe: SavedRecipe | null) {
  const [pantry, setPantry] = useState<PantryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pantryError, setPantryError] = useState<string | null>(null);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);

  const reloadPantry = useCallback(async () => {
    setLoading(true);
    setPantryError(null);
    try {
      const data = await fetchPantry();
      setPantry(data);
    } catch (err) {
      setPantry(null);
      setPantryError(err instanceof ApiRequestError ? err.message : "Could not load pantry.");
    } finally {
      setLoading(false);
    }
  }, []);

  const activeStapleCount = pantry ? activePantryStapleCount(pantry) : 0;

  const match: RecipePantryMatchResult | null = useMemo(() => {
    if (!recipe || !pantry || activeStapleCount === 0) {
      return null;
    }
    return evaluateRecipePantryMatch(recipe, buildPantryMatchIndex(pantry));
  }, [recipe, pantry, activeStapleCount]);

  const quickAddIngredient = useCallback(
    async (status: RecipePantryIngredientStatus) => {
      if (!status.quickAdd || status.matched) {
        return;
      }
      setAddingIndex(status.index);
      setPantryError(null);
      try {
        if (status.quickAdd.kind === "starter") {
          const updated = await setStarterInPantry(status.quickAdd.starterKey, true);
          setPantry(updated);
        } else {
          await createPantryItem(status.quickAdd.displayName, status.quickAdd.suggestedAliases);
          setPantry(await fetchPantry());
        }
      } catch (err) {
        setPantryError(err instanceof ApiRequestError ? err.message : "Could not add to pantry.");
      } finally {
        setAddingIndex(null);
      }
    },
    [],
  );

  return {
    pantry,
    match,
    loading,
    pantryError,
    activeStapleCount,
    addingIndex,
    reloadPantry,
    quickAddIngredient,
  };
}

export function usePantryMatchForRecipes(recipes: SavedRecipe[]) {
  const [pantry, setPantry] = useState<PantryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const reloadPantry = useCallback(async () => {
    setLoading(true);
    try {
      setPantry(await fetchPantry());
    } catch {
      setPantry(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const activeStapleCount = pantry ? activePantryStapleCount(pantry) : 0;

  const matchByRecipeId = useMemo(() => {
    const map = new Map<string, boolean>();
    if (!pantry || activeStapleCount === 0) {
      return map;
    }
    const index = buildPantryMatchIndex(pantry);
    for (const recipe of recipes) {
      map.set(recipe.id, evaluateRecipePantryMatch(recipe, index).isComplete);
    }
    return map;
  }, [recipes, pantry, activeStapleCount]);

  function pantryCompleteForRecipe(recipeId: string): boolean | null {
    if (loading || activeStapleCount === 0) {
      return null;
    }
    const value = matchByRecipeId.get(recipeId);
    return value === undefined ? null : value;
  }

  return {
    loading,
    hasStaples: activeStapleCount > 0,
    reloadPantry,
    pantryCompleteForRecipe,
  };
}
