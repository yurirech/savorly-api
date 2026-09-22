import { applyPantrySnapshot, lookupPantryKey } from "../ingredients/dictionary";

import { foldAlias } from "../ingredients/units";

import type { FoodCategory } from "../foodCategory";

import type { Ingredient, SavedRecipe } from "../recipe";

import { normalizePantryAlias } from "./pantryAliases";

import { resolveQuickAddPantryAction } from "./quickAddPantry";

import type { PantryResponse, RecipePantryIngredientStatus, RecipePantryMatchReason, RecipePantryMatchResult } from "./types";



export type PantryMatchIndex = {

  aliasKeys: Set<string>;

  aliasesByLength: string[];

  canonicalKeys: Set<string>;

};



export type RecipePantryScore = {

  recipe: SavedRecipe;

  matchedCount: number;

  totalCount: number;

  ratio: number;

  matchedIngredients: string[];

  missingIngredients: string[];

};



export type RankRecipesForPantryOptions = {

  category?: FoodCategory;

  excludeRecipeIds?: string[];

};



export function activePantryStapleCount(pantry: PantryResponse): number {

  return pantry.starters.filter((starter) => starter.inPantry).length + pantry.items.length;

}



export function buildPantryMatchIndex(pantry: PantryResponse): PantryMatchIndex {

  const aliasKeys = new Set<string>();

  const canonicalKeys = new Set<string>();



  for (const starter of pantry.starters) {

    if (!starter.inPantry) {

      continue;

    }

    aliasKeys.add(normalizePantryAlias(starter.defaultName));

    aliasKeys.add(normalizePantryAlias(starter.key.replaceAll("_", " ")));

    for (const alias of starter.defaultAliases) {

      aliasKeys.add(normalizePantryAlias(alias));

    }

    if (starter.canonicalKey) {

      canonicalKeys.add(starter.canonicalKey);

    }

  }



  for (const item of pantry.items) {

    for (const alias of item.aliases) {

      aliasKeys.add(normalizePantryAlias(alias));

    }

  }



  return {

    aliasKeys,

    aliasesByLength: [...aliasKeys].sort((a, b) => b.length - a.length),

    canonicalKeys,

  };

}



type IngredientPantryEvaluation = {

  matched: boolean;

  matchReason?: RecipePantryMatchReason;

};



function evaluateIngredientPantryMatch(ingredient: Ingredient, index: PantryMatchIndex): IngredientPantryEvaluation {

  const snapped = applyPantrySnapshot(ingredient);

  if (snapped.canonicalKey && index.canonicalKeys.has(snapped.canonicalKey)) {

    return { matched: true, matchReason: "canonical" };

  }



  const dictionaryMatch = lookupPantryKey(ingredient.name);

  if (dictionaryMatch && index.canonicalKeys.has(dictionaryMatch.key)) {

    return { matched: true, matchReason: "dictionary" };

  }



  const folded = foldAlias(ingredient.name);

  if (index.aliasKeys.has(folded)) {

    return { matched: true, matchReason: "alias" };

  }



  for (const alias of index.aliasesByLength) {

    if (folded === alias || folded.startsWith(`${alias} `) || folded.endsWith(` ${alias}`)) {

      return { matched: true, matchReason: "alias" };

    }

  }



  return { matched: false };

}



export function evaluateRecipePantryMatch(recipe: SavedRecipe, matchIndex: PantryMatchIndex): RecipePantryMatchResult {

  const ingredients: RecipePantryIngredientStatus[] = [];

  const missingIngredients: string[] = [];

  let matchedCount = 0;



  recipe.ingredients.forEach((ingredient, ingredientIndex) => {

    const label = ingredient.name.trim() || "ingredient";

    const evaluation = evaluateIngredientPantryMatch(ingredient, matchIndex);

    if (evaluation.matched) {

      matchedCount += 1;

      ingredients.push({

        index: ingredientIndex,

        name: label,

        matched: true,

        matchReason: evaluation.matchReason,

      });

    } else {

      missingIngredients.push(label);

      ingredients.push({

        index: ingredientIndex,

        name: label,

        matched: false,

        quickAdd: resolveQuickAddPantryAction(ingredient),

      });

    }

  });



  const totalCount = recipe.ingredients.length;

  return {

    isComplete: totalCount > 0 && matchedCount === totalCount,

    matchedCount,

    totalCount,

    missingIngredients,

    ingredients,

  };

}



export function scoreRecipePantryMatch(

  recipe: SavedRecipe,

  index: PantryMatchIndex,

): Omit<RecipePantryScore, "recipe"> {

  const evaluation = evaluateRecipePantryMatch(recipe, index);

  const matchedIngredients = evaluation.ingredients.filter((row) => row.matched).map((row) => row.name);



  return {

    matchedCount: evaluation.matchedCount,

    totalCount: evaluation.totalCount,

    ratio: evaluation.totalCount === 0 ? 0 : evaluation.matchedCount / evaluation.totalCount,

    matchedIngredients,

    missingIngredients: evaluation.missingIngredients,

  };

}



export function rankRecipesForPantry(

  recipes: SavedRecipe[],

  index: PantryMatchIndex,

  options: RankRecipesForPantryOptions = {},

): RecipePantryScore[] {

  let filtered = recipes;

  if (options.category) {

    filtered = filtered.filter((recipe) => recipe.category === options.category);

  }

  if (options.excludeRecipeIds?.length) {

    const exclude = new Set(options.excludeRecipeIds);

    filtered = filtered.filter((recipe) => !exclude.has(recipe.id));

  }



  const scored = filtered.map((recipe) => ({

    recipe,

    ...scoreRecipePantryMatch(recipe, index),

  }));



  scored.sort((a, b) => {

    if (b.ratio !== a.ratio) {

      return b.ratio - a.ratio;

    }

    if (b.matchedCount !== a.matchedCount) {

      return b.matchedCount - a.matchedCount;

    }

    return a.recipe.title.localeCompare(b.recipe.title, undefined, { sensitivity: "base" });

  });



  return scored;

}


