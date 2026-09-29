import { Platform } from "react-native";
import * as SQLite from "expo-sqlite";
import type { SavedRecipe } from "@savorly/shared";

const memory = new Map<string, SavedRecipe>();
const useSqlite = Platform.OS !== "web";
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function openDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("savorly.db").then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS recipes (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          payload TEXT NOT NULL,
          ingredient_names TEXT NOT NULL,
          tags TEXT NOT NULL,
          source_name TEXT,
          source_author TEXT,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS recipes_title_idx ON recipes (title);
        CREATE INDEX IF NOT EXISTS recipes_category_idx ON recipes (category);
        CREATE INDEX IF NOT EXISTS recipes_source_name_idx ON recipes (source_name);
        CREATE INDEX IF NOT EXISTS recipes_source_author_idx ON recipes (source_author);
        CREATE TABLE IF NOT EXISTS cookbooks (
          id TEXT PRIMARY KEY NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS cookbook_recipes (
          cookbook_id TEXT NOT NULL,
          recipe_id TEXT NOT NULL,
          PRIMARY KEY (cookbook_id, recipe_id)
        );
        CREATE TABLE IF NOT EXISTS foods (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS diary_days (
          date TEXT PRIMARY KEY NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS nutrition_profile (
          id TEXT PRIMARY KEY NOT NULL,
          payload TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS nutrition_recipes (
          id TEXT PRIMARY KEY NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS meal_staples (
          meal_name TEXT NOT NULL,
          food_id TEXT NOT NULL,
          PRIMARY KEY (meal_name, food_id)
        );
        CREATE TABLE IF NOT EXISTS nevo_foods (
          code INTEGER PRIMARY KEY NOT NULL,
          name_nl TEXT NOT NULL,
          name_en TEXT NOT NULL,
          payload TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS app_meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS outbox (
          id TEXT PRIMARY KEY NOT NULL,
          created_at TEXT NOT NULL,
          method TEXT NOT NULL,
          path TEXT NOT NULL,
          body TEXT
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

function sortByUpdated(recipes: SavedRecipe[]): SavedRecipe[] {
  return [...recipes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function matchesQuery(recipe: SavedRecipe, q: string): boolean {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  const haystack = [
    recipe.title,
    recipe.category,
    recipe.tags.join(" "),
    recipe.ingredients.map((item) => item.name).join(" "),
    recipe.source.sourceName ?? "",
    recipe.source.author ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(term);
}

export async function upsertCachedRecipe(recipe: SavedRecipe): Promise<void> {
  if (!useSqlite) {
    memory.set(recipe.id, recipe);
    return;
  }
  const db = await openDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO recipes
      (id, user_id, title, category, payload, ingredient_names, tags, source_name, source_author, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      recipe.id,
      recipe.userId,
      recipe.title,
      recipe.category,
      JSON.stringify(recipe),
      recipe.ingredients.map((item) => item.name).join(" "),
      recipe.tags.join(" "),
      recipe.source.sourceName ?? null,
      recipe.source.author ?? null,
      recipe.updatedAt,
    ],
  );
}

export async function mergeRecipes(recipes: SavedRecipe[]): Promise<void> {
  for (const recipe of recipes) {
    await upsertCachedRecipe(recipe);
  }
}

export async function replaceCache(recipes: SavedRecipe[]): Promise<void> {
  if (!useSqlite) {
    memory.clear();
    for (const recipe of recipes) {
      memory.set(recipe.id, recipe);
    }
    return;
  }
  const db = await openDb();
  await db.execAsync("DELETE FROM recipes");
  for (const recipe of recipes) {
    await upsertCachedRecipe(recipe);
  }
}

export async function searchCachedRecipes(q: string): Promise<SavedRecipe[]> {
  if (!useSqlite) {
    return sortByUpdated([...memory.values()].filter((recipe) => matchesQuery(recipe, q)));
  }
  const db = await openDb();
  const term = `%${q.trim()}%`;
  const rows = q.trim()
    ? await db.getAllAsync<{ payload: string }>(
        `SELECT payload FROM recipes
         WHERE title LIKE ?
            OR category LIKE ?
            OR ingredient_names LIKE ?
            OR tags LIKE ?
            OR IFNULL(source_name, '') LIKE ?
            OR IFNULL(source_author, '') LIKE ?
         ORDER BY updated_at DESC`,
        [term, term, term, term, term, term],
      )
    : await db.getAllAsync<{ payload: string }>(
        "SELECT payload FROM recipes ORDER BY updated_at DESC",
      );
  return rows.map((row) => JSON.parse(row.payload) as SavedRecipe);
}

export async function pruneRecipes(keepIds: string[]): Promise<void> {
  const keep = new Set(keepIds);
  const all = await searchCachedRecipes("");
  for (const recipe of all) {
    if (!keep.has(recipe.id)) {
      await removeCachedRecipe(recipe.id);
    }
  }
}

export async function removeCachedRecipe(id: string): Promise<void> {
  if (!useSqlite) {
    memory.delete(id);
    return;
  }
  const db = await openDb();
  await db.runAsync("DELETE FROM recipes WHERE id = ?", [id]);
}

export async function getCachedRecipe(id: string): Promise<SavedRecipe | null> {
  if (!useSqlite) {
    return memory.get(id) ?? null;
  }
  const db = await openDb();
  const row = await db.getFirstAsync<{ payload: string }>(
    "SELECT payload FROM recipes WHERE id = ?",
    [id],
  );
  return row ? (JSON.parse(row.payload) as SavedRecipe) : null;
}
