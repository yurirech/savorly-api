import { Platform } from "react-native";
import type {
  CookbookDetail,
  CookbookSummary,
  DiaryDayResponse,
  DiaryEntry,
  DiaryMealGroup,
  NevoFoodHit,
  NutrientVector,
  NutritionProfileResponse,
  SavedRecipe,
  UserFood,
} from "@savorly/shared";
import {
  computeNutritionTargets,
  dayTotalsFromMeals,
  mealTotalsFromEntries,
  NEVO_ATTRIBUTION,
  remainingMacros,
  scaleNutrition,
} from "@savorly/shared";
import { getCachedRecipe, openDb } from "../db/cache";

const useSqlite = Platform.OS !== "web";

type NevoRow = NevoFoodHit & { per100g: NutrientVector };

const memory = {
  cookbooks: new Map<string, CookbookSummary>(),
  membership: new Map<string, string[]>(),
  foods: new Map<string, UserFood>(),
  days: new Map<string, DiaryDayResponse>(),
  profile: null as NutritionProfileResponse | null,
  nutritionRecipes: new Map<string, unknown>(),
  staples: new Map<string, Set<string>>(),
  nevo: new Map<number, NevoRow>(),
  meta: new Map<string, string>(),
  outbox: [] as OutboxJob[],
};

export type OutboxJob = {
  id: string;
  createdAt: string;
  method: string;
  path: string;
  body: unknown | null;
};

export function newId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

function emptyTotals(): NutrientVector {
  return { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
}

export function recomputeDay(day: DiaryDayResponse, profile: NutritionProfileResponse | null): DiaryDayResponse {
  const meals = day.meals.map((meal) => ({
    ...meal,
    totals: mealTotalsFromEntries(meal.entries),
  }));
  const totals = dayTotalsFromMeals(meals);
  const targets = profile?.targets ?? (profile?.profile ? computeNutritionTargets(profile.profile) : day.targets);
  return {
    ...day,
    meals,
    totals,
    targets,
    remaining: targets ? remainingMacros(targets, totals) : null,
  };
}

export function emptyDay(date: string): DiaryDayResponse {
  return { date, meals: [], totals: emptyTotals(), remaining: null, targets: null };
}

export async function readMeta(key: string): Promise<string | null> {
  if (!useSqlite) return memory.meta.get(key) ?? null;
  const db = await openDb();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_meta WHERE key = ?", [key]);
  return row?.value ?? null;
}

export async function writeMeta(key: string, value: string): Promise<void> {
  if (!useSqlite) {
    memory.meta.set(key, value);
    return;
  }
  const db = await openDb();
  await db.runAsync("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)", [key, value]);
}

export async function saveCookbook(book: CookbookSummary): Promise<void> {
  if (!useSqlite) {
    memory.cookbooks.set(book.id, book);
    return;
  }
  const db = await openDb();
  await db.runAsync("INSERT OR REPLACE INTO cookbooks (id, payload, updated_at) VALUES (?, ?, ?)", [
    book.id,
    JSON.stringify(book),
    book.updatedAt,
  ]);
}

export async function listCookbooksLocal(): Promise<CookbookSummary[]> {
  if (!useSqlite) return [...memory.cookbooks.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const db = await openDb();
  const rows = await db.getAllAsync<{ payload: string }>("SELECT payload FROM cookbooks ORDER BY updated_at DESC");
  return rows.map((row) => JSON.parse(row.payload) as CookbookSummary);
}

export async function readCookbook(id: string): Promise<CookbookDetail | null> {
  const books = await listCookbooksLocal();
  const book = books.find((item) => item.id === id);
  if (!book) return null;
  const recipeIds = await cookbookRecipeIds(id);
  const recipes: SavedRecipe[] = [];
  for (const recipeId of recipeIds) {
    const recipe = await getCachedRecipe(recipeId);
    if (recipe) recipes.push(recipe);
  }
  return { ...book, recipeCount: recipes.length, previewRecipes: recipes.slice(0, 4), recipes };
}

export async function removeCookbook(id: string): Promise<void> {
  if (!useSqlite) {
    memory.cookbooks.delete(id);
    memory.membership.delete(id);
    return;
  }
  const db = await openDb();
  await db.runAsync("DELETE FROM cookbooks WHERE id = ?", [id]);
  await db.runAsync("DELETE FROM cookbook_recipes WHERE cookbook_id = ?", [id]);
}

export async function cookbookRecipeIds(cookbookId: string): Promise<string[]> {
  if (!useSqlite) return memory.membership.get(cookbookId) ?? [];
  const db = await openDb();
  const rows = await db.getAllAsync<{ recipe_id: string }>(
    "SELECT recipe_id FROM cookbook_recipes WHERE cookbook_id = ?",
    [cookbookId],
  );
  return rows.map((row) => row.recipe_id);
}

export async function recipeCookbookIds(recipeId: string): Promise<string[]> {
  if (!useSqlite) {
    return [...memory.membership.entries()].filter(([, ids]) => ids.includes(recipeId)).map(([id]) => id);
  }
  const db = await openDb();
  const rows = await db.getAllAsync<{ cookbook_id: string }>(
    "SELECT cookbook_id FROM cookbook_recipes WHERE recipe_id = ?",
    [recipeId],
  );
  return rows.map((row) => row.cookbook_id);
}

export async function setCookbookRecipes(cookbookId: string, recipeIds: string[]): Promise<void> {
  if (!useSqlite) {
    memory.membership.set(cookbookId, [...new Set(recipeIds)]);
    return;
  }
  const db = await openDb();
  await db.runAsync("DELETE FROM cookbook_recipes WHERE cookbook_id = ?", [cookbookId]);
  for (const recipeId of [...new Set(recipeIds)]) {
    await db.runAsync("INSERT OR REPLACE INTO cookbook_recipes (cookbook_id, recipe_id) VALUES (?, ?)", [
      cookbookId,
      recipeId,
    ]);
  }
}

export async function setRecipeCookbookIds(recipeId: string, cookbookIds: string[]): Promise<void> {
  const books = await listCookbooksLocal();
  for (const book of books) {
    const ids = await cookbookRecipeIds(book.id);
    const next = new Set(ids);
    if (cookbookIds.includes(book.id)) next.add(recipeId);
    else next.delete(recipeId);
    await setCookbookRecipes(book.id, [...next]);
  }
  for (const cookbookId of cookbookIds) {
    if (!books.some((book) => book.id === cookbookId)) {
      const ids = await cookbookRecipeIds(cookbookId);
      await setCookbookRecipes(cookbookId, [...ids, recipeId]);
    }
  }
}

export async function saveFood(food: UserFood): Promise<void> {
  if (!useSqlite) {
    memory.foods.set(food.id, food);
    return;
  }
  const db = await openDb();
  await db.runAsync("INSERT OR REPLACE INTO foods (id, name, payload, updated_at) VALUES (?, ?, ?, ?)", [
    food.id,
    food.name,
    JSON.stringify(food),
    food.updatedAt,
  ]);
}

export async function listFoodsLocal(query?: string): Promise<UserFood[]> {
  const term = query?.trim().toLowerCase() ?? "";
  const foods = useSqlite
    ? (
        await (await openDb()).getAllAsync<{ payload: string }>("SELECT payload FROM foods ORDER BY name")
      ).map((row) => JSON.parse(row.payload) as UserFood)
    : [...memory.foods.values()].sort((a, b) => a.name.localeCompare(b.name));
  if (!term) return foods;
  return foods.filter((food) => food.name.toLowerCase().includes(term));
}

export async function readFood(id: string): Promise<UserFood | null> {
  if (!useSqlite) return memory.foods.get(id) ?? null;
  const db = await openDb();
  const row = await db.getFirstAsync<{ payload: string }>("SELECT payload FROM foods WHERE id = ?", [id]);
  return row ? (JSON.parse(row.payload) as UserFood) : null;
}

export async function removeFood(id: string): Promise<void> {
  if (!useSqlite) {
    memory.foods.delete(id);
    return;
  }
  const db = await openDb();
  await db.runAsync("DELETE FROM foods WHERE id = ?", [id]);
  await db.runAsync("DELETE FROM meal_staples WHERE food_id = ?", [id]);
}

export async function saveDay(day: DiaryDayResponse): Promise<void> {
  const profile = await readProfile();
  const next = recomputeDay(day, profile);
  if (!useSqlite) {
    memory.days.set(next.date, next);
    return;
  }
  const db = await openDb();
  await db.runAsync("INSERT OR REPLACE INTO diary_days (date, payload, updated_at) VALUES (?, ?, ?)", [
    next.date,
    JSON.stringify(next),
    nowIso(),
  ]);
}

export async function readDay(date: string): Promise<DiaryDayResponse | null> {
  if (!useSqlite) return memory.days.get(date) ?? null;
  const db = await openDb();
  const row = await db.getFirstAsync<{ payload: string }>("SELECT payload FROM diary_days WHERE date = ?", [date]);
  return row ? (JSON.parse(row.payload) as DiaryDayResponse) : null;
}

export async function listDays(): Promise<DiaryDayResponse[]> {
  if (!useSqlite) return [...memory.days.values()];
  const db = await openDb();
  const rows = await db.getAllAsync<{ payload: string }>("SELECT payload FROM diary_days");
  return rows.map((row) => JSON.parse(row.payload) as DiaryDayResponse);
}

export async function saveProfile(profile: NutritionProfileResponse): Promise<void> {
  if (!useSqlite) {
    memory.profile = profile;
    return;
  }
  const db = await openDb();
  await db.runAsync("INSERT OR REPLACE INTO nutrition_profile (id, payload) VALUES ('me', ?)", [JSON.stringify(profile)]);
}

export async function readProfile(): Promise<NutritionProfileResponse | null> {
  if (!useSqlite) return memory.profile;
  const db = await openDb();
  const row = await db.getFirstAsync<{ payload: string }>("SELECT payload FROM nutrition_profile WHERE id = 'me'");
  return row ? (JSON.parse(row.payload) as NutritionProfileResponse) : null;
}

export async function saveNutritionRecipe(detail: { id: string }): Promise<void> {
  if (!useSqlite) {
    memory.nutritionRecipes.set(detail.id, detail);
    return;
  }
  const db = await openDb();
  await db.runAsync("INSERT OR REPLACE INTO nutrition_recipes (id, payload, updated_at) VALUES (?, ?, ?)", [
    detail.id,
    JSON.stringify(detail),
    nowIso(),
  ]);
}

export async function listNutritionRecipesLocal(): Promise<
  Array<{ id: string; title: string; sourceRecipeId: string | null }>
> {
  const rows = useSqlite
    ? await (await openDb()).getAllAsync<{ payload: string }>("SELECT payload FROM nutrition_recipes")
    : [...memory.nutritionRecipes.values()].map((value) => ({ payload: JSON.stringify(value) }));
  return rows.map((row) => {
    const detail = JSON.parse(row.payload) as { id: string; title?: string; sourceRecipeId?: string | null };
    return { id: detail.id, title: detail.title ?? "", sourceRecipeId: detail.sourceRecipeId ?? null };
  });
}

export async function readNutritionRecipe<T>(id: string): Promise<T | null> {
  if (!useSqlite) return (memory.nutritionRecipes.get(id) as T | undefined) ?? null;
  const db = await openDb();
  const row = await db.getFirstAsync<{ payload: string }>("SELECT payload FROM nutrition_recipes WHERE id = ?", [id]);
  return row ? (JSON.parse(row.payload) as T) : null;
}

export async function replaceFoodStaples(foodId: string, mealNames: string[]): Promise<void> {
  if (!useSqlite) {
    for (const [name, ids] of memory.staples) {
      ids.delete(foodId);
      if (ids.size === 0) memory.staples.delete(name);
    }
    for (const name of mealNames) {
      const ids = memory.staples.get(name) ?? new Set<string>();
      ids.add(foodId);
      memory.staples.set(name, ids);
    }
    return;
  }
  const db = await openDb();
  await db.runAsync("DELETE FROM meal_staples WHERE food_id = ?", [foodId]);
  for (const mealName of mealNames) {
    await db.runAsync("INSERT OR REPLACE INTO meal_staples (meal_name, food_id) VALUES (?, ?)", [mealName, foodId]);
  }
}

export async function stapleNamesForFood(foodId: string): Promise<string[]> {
  if (!useSqlite) {
    return [...memory.staples.entries()].filter(([, ids]) => ids.has(foodId)).map(([name]) => name);
  }
  const db = await openDb();
  const rows = await db.getAllAsync<{ meal_name: string }>(
    "SELECT meal_name FROM meal_staples WHERE food_id = ? ORDER BY meal_name",
    [foodId],
  );
  return rows.map((row) => row.meal_name);
}

export async function stapleFoodIds(mealName: string): Promise<string[]> {
  if (!useSqlite) return [...(memory.staples.get(mealName) ?? [])];
  const db = await openDb();
  const rows = await db.getAllAsync<{ food_id: string }>("SELECT food_id FROM meal_staples WHERE meal_name = ?", [
    mealName,
  ]);
  return rows.map((row) => row.food_id);
}

export async function saveNevoFoods(rows: NevoRow[]): Promise<void> {
  if (!useSqlite) {
    memory.nevo.clear();
    for (const row of rows) memory.nevo.set(row.nevoCode, row);
    return;
  }
  const db = await openDb();
  await db.execAsync("DELETE FROM nevo_foods");
  for (const row of rows) {
    await db.runAsync("INSERT OR REPLACE INTO nevo_foods (code, name_nl, name_en, payload) VALUES (?, ?, ?, ?)", [
      row.nevoCode,
      row.name,
      row.nameEn,
      JSON.stringify(row),
    ]);
  }
  await writeMeta("nevo", "1");
}

export async function hasNevoSnapshot(): Promise<boolean> {
  return (await readMeta("nevo")) === "1";
}

export async function searchNevoLocal(query: string): Promise<NevoFoodHit[]> {
  const term = query.trim().toLowerCase();
  if (term.length < 2) return [];
  const rows = useSqlite
    ? (
        await (await openDb()).getAllAsync<{ payload: string }>(
          "SELECT payload FROM nevo_foods WHERE name_nl LIKE ? OR name_en LIKE ? ORDER BY name_nl LIMIT 20",
          [`%${term}%`, `%${term}%`],
        )
      ).map((row) => JSON.parse(row.payload) as NevoRow)
    : [...memory.nevo.values()]
        .filter((row) => row.name.toLowerCase().includes(term) || row.nameEn.toLowerCase().includes(term))
        .slice(0, 20);
  return rows.map(({ per100g: _per100g, ...hit }) => hit);
}

export async function readNevoFood(code: number): Promise<NevoRow | null> {
  if (!useSqlite) return memory.nevo.get(code) ?? null;
  const db = await openDb();
  const row = await db.getFirstAsync<{ payload: string }>("SELECT payload FROM nevo_foods WHERE code = ?", [code]);
  return row ? (JSON.parse(row.payload) as NevoRow) : null;
}

export { NEVO_ATTRIBUTION };

export async function enqueueJob(job: Omit<OutboxJob, "id" | "createdAt">): Promise<void> {
  const row: OutboxJob = { id: newId(), createdAt: nowIso(), ...job };
  if (!useSqlite) {
    memory.outbox.push(row);
    return;
  }
  const db = await openDb();
  await db.runAsync("INSERT INTO outbox (id, created_at, method, path, body) VALUES (?, ?, ?, ?, ?)", [
    row.id,
    row.createdAt,
    row.method,
    row.path,
    row.body == null ? null : JSON.stringify(row.body),
  ]);
}

export async function listJobs(): Promise<OutboxJob[]> {
  if (!useSqlite) return [...memory.outbox];
  const db = await openDb();
  const rows = await db.getAllAsync<{ id: string; created_at: string; method: string; path: string; body: string | null }>(
    "SELECT id, created_at, method, path, body FROM outbox ORDER BY created_at",
  );
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    method: row.method,
    path: row.path,
    body: row.body ? (JSON.parse(row.body) as unknown) : null,
  }));
}

export async function deleteJob(id: string): Promise<void> {
  if (!useSqlite) {
    memory.outbox = memory.outbox.filter((job) => job.id !== id);
    return;
  }
  const db = await openDb();
  await db.runAsync("DELETE FROM outbox WHERE id = ?", [id]);
}

export function localFood(input: {
  id: string;
  name: string;
  per100g: NutrientVector;
  source: UserFood["source"];
  nevoCode?: number | null;
}): UserFood {
  const now = nowIso();
  return {
    id: input.id,
    name: input.name,
    originalName: input.name,
    source: input.source,
    fdcId: null,
    nevoCode: input.nevoCode ?? null,
    nutritionRecipeId: null,
    per100g: input.per100g,
    createdAt: now,
    updatedAt: now,
  };
}

export function localEntry(input: {
  id: string;
  date: string;
  mealId: string;
  foodId: string | null;
  foodName: string;
  grams: number;
  nutrients: NutrientVector;
  kind: DiaryEntry["kind"];
  label?: string;
}): DiaryEntry {
  return {
    id: input.id,
    date: input.date,
    mealId: input.mealId,
    kind: input.kind,
    foodId: input.foodId,
    label: input.label,
    foodName: input.foodName,
    grams: input.grams,
    nutrients: input.nutrients,
    createdAt: nowIso(),
  };
}

export async function mutateDay(
  date: string,
  change: (day: DiaryDayResponse) => DiaryDayResponse,
): Promise<DiaryDayResponse> {
  const current = (await readDay(date)) ?? emptyDay(date);
  const next = await (async () => change(current))();
  await saveDay(next);
  return (await readDay(date)) ?? next;
}

export function findMeal(day: DiaryDayResponse, mealId: string): DiaryMealGroup | undefined {
  return day.meals.find((meal) => meal.id === mealId);
}

export function withMealFood(
  day: DiaryDayResponse,
  mealId: string,
  entry: DiaryEntry,
): DiaryDayResponse {
  return {
    ...day,
    meals: day.meals.map((meal) =>
      meal.id === mealId ? { ...meal, entries: [...meal.entries, entry] } : meal,
    ),
  };
}

export function scaledFoodEntry(food: UserFood, grams: number, date: string, mealId: string, id: string): DiaryEntry {
  return localEntry({
    id,
    date,
    mealId,
    foodId: food.id,
    foodName: food.name,
    grams,
    nutrients: scaleNutrition(food.per100g, grams),
    kind: "food",
  });
}
