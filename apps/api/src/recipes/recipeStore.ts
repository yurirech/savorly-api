import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { GeneratedRecipe, RecipeSearchQuery, SavedRecipe } from "@savorly/shared";
import { applyPantrySnapshot, parseFoodCategory } from "@savorly/shared";
import type { Database } from "../db/client";
import { recipes } from "../db/schema";
import { AppError } from "../errors";
import { parseRecipeNutrition } from "../normalize/geminiRecipeSchema";

export async function saveRecipe(db: Database, userId: string, recipe: GeneratedRecipe): Promise<SavedRecipe> {
  const [row] = await db
    .insert(recipes)
    .values(toRow(userId, recipe))
    .returning();
  return fromRow(row);
}

export async function updateRecipe(
  db: Database,
  userId: string,
  id: string,
  recipe: GeneratedRecipe,
): Promise<SavedRecipe> {
  const [row] = await db
    .update(recipes)
    .set({ ...toRow(userId, recipe), updatedAt: new Date() })
    .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
    .returning();
  if (!row) {
    throw new AppError("not_found", "Recipe not found.", 404);
  }
  return fromRow(row);
}

export async function getRecipe(db: Database, userId: string, id: string): Promise<SavedRecipe> {
  const [row] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.userId, userId)));
  if (!row) {
    throw new AppError("not_found", "Recipe not found.", 404);
  }
  return fromRow(row);
}

export async function deleteRecipe(db: Database, userId: string, id: string): Promise<void> {
  const deleted = await db
    .delete(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
    .returning({ id: recipes.id });
  if (!deleted[0]) {
    throw new AppError("not_found", "Recipe not found.", 404);
  }
}

export async function searchRecipes(
  db: Database,
  userId: string,
  query: RecipeSearchQuery,
): Promise<SavedRecipe[]> {
  const filters = [eq(recipes.userId, userId)];
  if (query.category) {
    filters.push(eq(recipes.category, query.category));
  }
  if (query.q?.trim()) {
    const term = `%${query.q.trim()}%`;
    filters.push(
      or(
        ilike(recipes.title, term),
        sql`${recipes.category} ILIKE ${term}`,
        sql`EXISTS (SELECT 1 FROM unnest(${recipes.tags}) AS tag WHERE tag ILIKE ${term})`,
        sql`EXISTS (SELECT 1 FROM unnest(${recipes.ingredientNames}) AS name WHERE name ILIKE ${term})`,
        sql`${recipes.source}->>'sourceName' ILIKE ${term}`,
        sql`${recipes.source}->>'author' ILIKE ${term}`,
      )!,
    );
  }

  const rows = await db
    .select()
    .from(recipes)
    .where(and(...filters))
    .orderBy(desc(recipes.updatedAt));
  return rows.map(fromRow);
}

export function searchDocument(recipe: GeneratedRecipe) {
  return {
    title: recipe.title,
    category: recipe.category,
    tags: recipe.tags,
    ingredientNames: recipe.ingredients.map((ingredient) => ingredient.name.toLowerCase()),
    sourceName: recipe.source.sourceName ?? "",
    sourceAuthor: recipe.source.author ?? "",
  };
}

function toRow(userId: string, recipe: GeneratedRecipe) {
  const search = searchDocument(recipe);
  return {
    userId,
    title: recipe.title,
    category: recipe.category,
    servings: recipe.servings ?? null,
    prepTimeMinutes: recipe.prepTimeMinutes ?? null,
    cookTimeMinutes: recipe.cookTimeMinutes ?? null,
    ingredients: recipe.ingredients.map((ingredient) => applyPantrySnapshot(ingredient)),
    steps: recipe.steps,
    tags: recipe.tags,
    notes: recipe.notes ?? null,
    uncertainties: recipe.uncertainties,
    nutrition: recipe.nutrition ?? null,
    source: recipe.source,
    ingredientNames: search.ingredientNames,
  };
}

export function recipeFromRow(row: typeof recipes.$inferSelect): SavedRecipe {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    category: parseFoodCategory(row.category),
    servings: row.servings,
    prepTimeMinutes: row.prepTimeMinutes,
    cookTimeMinutes: row.cookTimeMinutes,
    ingredients: (row.ingredients as SavedRecipe["ingredients"]).map((ingredient) => applyPantrySnapshot(ingredient)),
    steps: row.steps as SavedRecipe["steps"],
    tags: row.tags,
    notes: row.notes,
    uncertainties: row.uncertainties as string[],
    nutrition: parseRecipeNutrition(row.nutrition),
    source: row.source as SavedRecipe["source"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function fromRow(row: typeof recipes.$inferSelect): SavedRecipe {
  return recipeFromRow(row);
}
