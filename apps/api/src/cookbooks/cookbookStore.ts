import { and, desc, eq, inArray } from "drizzle-orm";
import type { CookbookDetail, CookbookSummary, SavedRecipe } from "@savorly/shared";
import type { Database } from "../db/client";
import { cookbookRecipes, cookbooks, recipes } from "../db/schema";
import { AppError } from "../errors";
import { recipeFromRow } from "../recipes/recipeStore";

const PREVIEW_COUNT = 4;

export function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

export function toCookbookSummary(
  book: typeof cookbooks.$inferSelect,
  members: SavedRecipe[],
): CookbookSummary {
  return {
    id: book.id,
    userId: book.userId,
    name: book.name,
    recipeCount: members.length,
    previewRecipes: members.slice(0, PREVIEW_COUNT),
    createdAt: book.createdAt.toISOString(),
    updatedAt: book.updatedAt.toISOString(),
  };
}

export async function listCookbooks(db: Database, userId: string): Promise<CookbookSummary[]> {
  const books = await db
    .select()
    .from(cookbooks)
    .where(eq(cookbooks.userId, userId))
    .orderBy(desc(cookbooks.updatedAt));
  if (books.length === 0) {
    return [];
  }

  const members = await loadMembers(db, books.map((book) => book.id));
  return books.map((book) => toCookbookSummary(book, members.get(book.id) ?? []));
}

export async function createCookbook(db: Database, userId: string, name: string): Promise<CookbookSummary> {
  const [row] = await db
    .insert(cookbooks)
    .values({ userId, name: name.trim() })
    .returning();
  return toCookbookSummary(row, []);
}

export async function getCookbook(db: Database, userId: string, id: string): Promise<CookbookDetail> {
  const book = await requireCookbook(db, userId, id);
  const members = await loadMembers(db, [id]);
  const recipesInBook = members.get(id) ?? [];
  return { ...toCookbookSummary(book, recipesInBook), recipes: recipesInBook };
}

export async function renameCookbook(
  db: Database,
  userId: string,
  id: string,
  name: string,
): Promise<CookbookSummary> {
  const [row] = await db
    .update(cookbooks)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(and(eq(cookbooks.id, id), eq(cookbooks.userId, userId)))
    .returning();
  if (!row) {
    throw new AppError("not_found", "Cookbook not found.", 404);
  }
  const members = await loadMembers(db, [id]);
  return toCookbookSummary(row, members.get(id) ?? []);
}

export async function deleteCookbook(db: Database, userId: string, id: string): Promise<void> {
  const deleted = await db
    .delete(cookbooks)
    .where(and(eq(cookbooks.id, id), eq(cookbooks.userId, userId)))
    .returning({ id: cookbooks.id });
  if (!deleted[0]) {
    throw new AppError("not_found", "Cookbook not found.", 404);
  }
}

export async function addRecipesToCookbook(
  db: Database,
  userId: string,
  cookbookId: string,
  recipeIds: string[],
): Promise<CookbookDetail> {
  await requireCookbook(db, userId, cookbookId);
  const ids = uniqueIds(recipeIds);
  if (ids.length === 0) {
    throw new AppError("validation_error", "Pick at least one recipe.", 400);
  }
  await requireOwnedRecipes(db, userId, ids);
  await db
    .insert(cookbookRecipes)
    .values(ids.map((recipeId) => ({ cookbookId, recipeId })))
    .onConflictDoNothing();
  await touchCookbook(db, cookbookId);
  return getCookbook(db, userId, cookbookId);
}

export async function removeRecipeFromCookbook(
  db: Database,
  userId: string,
  cookbookId: string,
  recipeId: string,
): Promise<void> {
  await requireCookbook(db, userId, cookbookId);
  await db
    .delete(cookbookRecipes)
    .where(and(eq(cookbookRecipes.cookbookId, cookbookId), eq(cookbookRecipes.recipeId, recipeId)));
  await touchCookbook(db, cookbookId);
}

export async function listCookbookIdsForRecipe(
  db: Database,
  userId: string,
  recipeId: string,
): Promise<string[]> {
  await requireOwnedRecipes(db, userId, [recipeId]);
  const rows = await db
    .select({ cookbookId: cookbookRecipes.cookbookId })
    .from(cookbookRecipes)
    .innerJoin(cookbooks, eq(cookbooks.id, cookbookRecipes.cookbookId))
    .where(and(eq(cookbookRecipes.recipeId, recipeId), eq(cookbooks.userId, userId)));
  return rows.map((row) => row.cookbookId);
}

export async function setRecipeCookbooks(
  db: Database,
  userId: string,
  recipeId: string,
  cookbookIds: string[],
): Promise<string[]> {
  await requireOwnedRecipes(db, userId, [recipeId]);
  const ids = uniqueIds(cookbookIds);
  if (ids.length > 0) {
    await requireOwnedCookbooks(db, userId, ids);
  }

  const current = await listCookbookIdsForRecipe(db, userId, recipeId);
  const next = new Set(ids);
  const toRemove = current.filter((id) => !next.has(id));
  const toAdd = ids.filter((id) => !current.includes(id));

  if (toRemove.length > 0) {
    await db
      .delete(cookbookRecipes)
      .where(and(eq(cookbookRecipes.recipeId, recipeId), inArray(cookbookRecipes.cookbookId, toRemove)));
  }
  if (toAdd.length > 0) {
    await db.insert(cookbookRecipes).values(toAdd.map((cookbookId) => ({ cookbookId, recipeId })));
  }

  const touched = uniqueIds([...toRemove, ...toAdd]);
  if (touched.length > 0) {
    await db.update(cookbooks).set({ updatedAt: new Date() }).where(inArray(cookbooks.id, touched));
  }

  return listCookbookIdsForRecipe(db, userId, recipeId);
}

async function requireCookbook(db: Database, userId: string, id: string) {
  const [row] = await db
    .select()
    .from(cookbooks)
    .where(and(eq(cookbooks.id, id), eq(cookbooks.userId, userId)));
  if (!row) {
    throw new AppError("not_found", "Cookbook not found.", 404);
  }
  return row;
}

async function requireOwnedRecipes(db: Database, userId: string, ids: string[]): Promise<void> {
  const rows = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(eq(recipes.userId, userId), inArray(recipes.id, ids)));
  if (rows.length !== ids.length) {
    throw new AppError("not_found", "Recipe not found.", 404);
  }
}

async function requireOwnedCookbooks(db: Database, userId: string, ids: string[]): Promise<void> {
  const rows = await db
    .select({ id: cookbooks.id })
    .from(cookbooks)
    .where(and(eq(cookbooks.userId, userId), inArray(cookbooks.id, ids)));
  if (rows.length !== ids.length) {
    throw new AppError("not_found", "Cookbook not found.", 404);
  }
}

async function touchCookbook(db: Database, id: string): Promise<void> {
  await db.update(cookbooks).set({ updatedAt: new Date() }).where(eq(cookbooks.id, id));
}

async function loadMembers(db: Database, cookbookIds: string[]): Promise<Map<string, SavedRecipe[]>> {
  const grouped = new Map<string, SavedRecipe[]>();
  for (const id of cookbookIds) {
    grouped.set(id, []);
  }
  if (cookbookIds.length === 0) {
    return grouped;
  }

  const rows = await db
    .select({
      cookbookId: cookbookRecipes.cookbookId,
      addedAt: cookbookRecipes.addedAt,
      recipe: recipes,
    })
    .from(cookbookRecipes)
    .innerJoin(recipes, eq(recipes.id, cookbookRecipes.recipeId))
    .where(inArray(cookbookRecipes.cookbookId, cookbookIds))
    .orderBy(desc(cookbookRecipes.addedAt));

  for (const row of rows) {
    grouped.get(row.cookbookId)?.push(recipeFromRow(row.recipe));
  }
  return grouped;
}
