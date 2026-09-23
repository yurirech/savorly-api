import { eq } from "drizzle-orm";
import {
  applyPantrySnapshot,
  isIngredientSection,
  pantryByKey,
  type GeneratedRecipe,
  type PantryIngredient,
} from "@savorly/shared";
import type { Env } from "../config";
import type { Database } from "../db/client";
import { ingredientDictionary } from "../db/schema";
import { identifyUnknownIngredients, needsIdentify } from "./identifyUnknownIngredients";

export async function resolveIngredients(
  recipe: GeneratedRecipe,
  options: { db?: Database; env: Env },
): Promise<GeneratedRecipe> {
  const learned = options.db ? await loadLearned(options.db) : [];
  const firstPass = recipe.ingredients.map((ingredient) =>
    isIngredientSection(ingredient) ? ingredient : applyPantrySnapshot(ingredient, learned),
  );
  const extras = [...learned];

  const shouldIdentify =
    !options.env.useMockImports && Boolean(options.env.geminiApiKey) && firstPass.some(needsIdentify);

  if (shouldIdentify && options.env.geminiApiKey) {
    try {
      const identified = await identifyUnknownIngredients({
        apiKey: options.env.geminiApiKey,
        model: options.env.geminiModel,
        ingredients: firstPass,
      });
      extras.push(...identified);
      if (options.db) {
        await persistLearned(options.db, identified);
      }
    } catch (error) {
      console.error("Ingredient identify skipped", error instanceof Error ? error.message : error);
    }
  }

  return {
    ...recipe,
    ingredients: firstPass.map((ingredient) => applyPantrySnapshot(ingredient, extras)),
  };
}

export function snapshotRecipeIngredients(recipe: GeneratedRecipe, extras: PantryIngredient[] = []): GeneratedRecipe {
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((ingredient) =>
      isIngredientSection(ingredient) ? ingredient : applyPantrySnapshot(ingredient, extras),
    ),
  };
}

async function loadLearned(db: Database): Promise<PantryIngredient[]> {
  const rows = await db.select().from(ingredientDictionary);
  return rows.map((row) => ({
    key: row.key,
    gramsPerCup: row.gramsPerCup,
    aliases: row.aliases,
  }));
}

async function persistLearned(db: Database, items: PantryIngredient[]): Promise<void> {
  for (const item of items) {
    if (pantryByKey(item.key)) continue;
    const [existing] = await db.select().from(ingredientDictionary).where(eq(ingredientDictionary.key, item.key));
    const aliases = unique(existing ? [...existing.aliases, ...item.aliases] : item.aliases);
    if (existing) {
      await db
        .update(ingredientDictionary)
        .set({ gramsPerCup: existing.gramsPerCup, aliases })
        .where(eq(ingredientDictionary.key, item.key));
      continue;
    }
    await db.insert(ingredientDictionary).values({
      key: item.key,
      gramsPerCup: item.gramsPerCup,
      aliases,
    });
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
