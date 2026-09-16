import { Platform } from "react-native";
import * as SQLite from "expo-sqlite";
import type { SavedRecipe } from "@savorly/shared";

const memory = new Map<string, SavedRecipe>();
const useSqlite = Platform.OS !== "web";
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function openDb() {
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
