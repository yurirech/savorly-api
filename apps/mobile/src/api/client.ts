import type {
  ApiErrorBody,
  AuthResponse,
  CookbookDetail,
  CookbookSummary,
  DiaryDayResponse,
  DiaryEntry,
  GeneratedRecipe,
  MealSuggestionResponse,
  NutrientVector,
  NutritionProfileInput,
  NutritionProfileResponse,
  PantryResponse,
  PantrySubstitutionResponse,
  FoodCategory,
  RecipeGenerateRequest,
  RecipeImportRequest,
  SavedRecipe,
  UsdaFoodHit,
  NevoFoodHit,
  UserFood,
  UserPantryItem,
} from "@savorly/shared";
import { coerceDiaryDayResponse } from "@savorly/shared";
import { getToken, clearSession } from "../auth/session";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly offerTextPaste = false,
  ) {
    super(message);
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (response.status === 401) {
    await clearSession();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const raw = await response.text();
  let data: (T & ApiErrorBody) | null = null;
  if (raw) {
    try {
      data = JSON.parse(raw) as T & ApiErrorBody;
    } catch {
      throw new ApiRequestError(
        "internal_error",
        response.status === 404
          ? "This API is missing that endpoint. Use the local API or deploy the latest backend."
          : "The server returned something that was not JSON.",
      );
    }
  }

  if (!response.ok) {
    throw new ApiRequestError(
      data?.error?.code ?? "internal_error",
      data?.error?.message ?? "Request failed",
      Boolean(data?.error?.offerTextPaste),
    );
  }
  if (!data) {
    throw new ApiRequestError("internal_error", "Empty response from the API.");
  }
  return data;
}

export { request as apiRequest };

async function requestDiaryDay(path: string, init: RequestInit = {}): Promise<DiaryDayResponse> {
  const data = await request<unknown>(path, init);
  return coerceDiaryDayResponse(data);
}

async function offline<T>(err: unknown, fallback: () => Promise<T>): Promise<T> {
  const { isUnavailable } = await import("../offline/sync");
  if (!isUnavailable(err)) throw err;
  return fallback();
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(email: string, password: string) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function importRecipe(body: RecipeImportRequest) {
  return request<{ recipe: GeneratedRecipe }>("/imports", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function generateRecipe(body: RecipeGenerateRequest) {
  return request<{ recipe: GeneratedRecipe; adaptSummary?: string }>("/generations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listRecipes(q?: string) {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  try {
    const live = await request<{ recipes: SavedRecipe[] }>(`/recipes${query}`);
    const { cacheRecipeList } = await import("../offline/sync");
    await cacheRecipeList(live.recipes, !q);
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { searchCachedRecipes } = await import("../db/cache");
      return { recipes: await searchCachedRecipes(q ?? "") };
    });
  }
}

export async function createRecipe(recipe: GeneratedRecipe) {
  try {
    const saved = await request<{ recipe: SavedRecipe }>("/recipes", {
      method: "POST",
      body: JSON.stringify(recipe),
    });
    const { upsertCachedRecipe } = await import("../db/cache");
    await upsertCachedRecipe(saved.recipe);
    return saved;
  } catch (err) {
    return offline(err, async () => {
      const { getUser } = await import("../auth/session");
      const { upsertCachedRecipe } = await import("../db/cache");
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const { newId } = await import("../offline/store");
      const user = await getUser();
      const id = newId();
      const now = new Date().toISOString();
      const saved: SavedRecipe = {
        ...recipe,
        id,
        userId: user?.id ?? "",
        createdAt: now,
        updatedAt: now,
      };
      await upsertCachedRecipe(saved);
      await enqueue("POST", "/recipes", { ...recipe, id });
      void flushOutbox();
      return { recipe: saved };
    });
  }
}

export async function getRecipe(id: string) {
  try {
    const live = await request<{ recipe: SavedRecipe }>(`/recipes/${id}`);
    const { upsertCachedRecipe } = await import("../db/cache");
    await upsertCachedRecipe(live.recipe);
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { getCachedRecipe } = await import("../db/cache");
      const recipe = await getCachedRecipe(id);
      if (!recipe) throw err;
      return { recipe };
    });
  }
}

export async function copyRecipe(id: string) {
  try {
    const saved = await request<{ recipe: SavedRecipe }>(`/recipes/${id}/copy`, { method: "POST" });
    const { upsertCachedRecipe } = await import("../db/cache");
    await upsertCachedRecipe(saved.recipe);
    return saved;
  } catch (err) {
    return offline(err, async () => {
      const source = await getRecipe(id);
      const copy = await createRecipe({
        ...source.recipe,
        title: `${source.recipe.title} copy`,
      });
      const membership = await listRecipeCookbooks(id);
      if (membership.cookbookIds.length > 0) {
        await setRecipeCookbooks(copy.recipe.id, membership.cookbookIds);
      }
      return copy;
    });
  }
}

export async function deleteRecipe(id: string) {
  try {
    await request<void>(`/recipes/${id}`, { method: "DELETE" });
    const { removeCachedRecipe } = await import("../db/cache");
    await removeCachedRecipe(id);
  } catch (err) {
    await offline(err, async () => {
      const { removeCachedRecipe } = await import("../db/cache");
      const { enqueue, flushOutbox } = await import("../offline/sync");
      await removeCachedRecipe(id);
      await enqueue("DELETE", `/recipes/${id}`, null);
      void flushOutbox();
    });
  }
}

export async function updateRecipe(id: string, recipe: GeneratedRecipe) {
  try {
    const saved = await request<{ recipe: SavedRecipe }>(`/recipes/${id}`, {
      method: "PUT",
      body: JSON.stringify(recipe),
    });
    const { upsertCachedRecipe } = await import("../db/cache");
    await upsertCachedRecipe(saved.recipe);
    return saved;
  } catch (err) {
    return offline(err, async () => {
      const { getCachedRecipe, upsertCachedRecipe } = await import("../db/cache");
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const current = await getCachedRecipe(id);
      const now = new Date().toISOString();
      const saved: SavedRecipe = {
        ...(current ?? { ...recipe, id, userId: "", createdAt: now }),
        ...recipe,
        id,
        updatedAt: now,
      };
      await upsertCachedRecipe(saved);
      await enqueue("PUT", `/recipes/${id}`, recipe);
      void flushOutbox();
      return { recipe: saved };
    });
  }
}

export async function listCookbooks() {
  try {
    const live = await request<{ cookbooks: CookbookSummary[] }>("/cookbooks");
    const { cookbookRecipeIds, saveCookbook, setCookbookRecipes } = await import("../offline/store");
    for (const book of live.cookbooks) {
      await saveCookbook(book);
      const existing = await cookbookRecipeIds(book.id);
      if (existing.length === 0) {
        await setCookbookRecipes(
          book.id,
          book.previewRecipes.map((recipe) => recipe.id),
        );
      }
    }
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { listCookbooksLocal } = await import("../offline/store");
      return { cookbooks: await listCookbooksLocal() };
    });
  }
}

export async function createCookbook(name: string) {
  try {
    const live = await request<{ cookbook: CookbookSummary }>("/cookbooks", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    const { saveCookbook } = await import("../offline/store");
    await saveCookbook(live.cookbook);
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { getUser } = await import("../auth/session");
      const { newId, saveCookbook } = await import("../offline/store");
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const user = await getUser();
      const now = new Date().toISOString();
      const cookbook: CookbookSummary = {
        id: newId(),
        userId: user?.id ?? "",
        name: name.trim(),
        recipeCount: 0,
        previewRecipes: [],
        createdAt: now,
        updatedAt: now,
      };
      await saveCookbook(cookbook);
      await enqueue("POST", "/cookbooks", { id: cookbook.id, name: cookbook.name });
      void flushOutbox();
      return { cookbook };
    });
  }
}

export async function getCookbook(id: string) {
  try {
    const live = await request<{ cookbook: CookbookDetail }>(`/cookbooks/${id}`);
    const { saveCookbook, setCookbookRecipes } = await import("../offline/store");
    const { upsertCachedRecipe } = await import("../db/cache");
    await saveCookbook(live.cookbook);
    await setCookbookRecipes(
      id,
      live.cookbook.recipes.map((recipe) => recipe.id),
    );
    for (const recipe of live.cookbook.recipes) await upsertCachedRecipe(recipe);
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { readCookbook } = await import("../offline/store");
      const cookbook = await readCookbook(id);
      if (!cookbook) throw err;
      return { cookbook };
    });
  }
}

export async function updateCookbook(id: string, name: string) {
  try {
    const live = await request<{ cookbook: CookbookSummary }>(`/cookbooks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    const { saveCookbook } = await import("../offline/store");
    await saveCookbook(live.cookbook);
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { readCookbook, saveCookbook } = await import("../offline/store");
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const current = await readCookbook(id);
      if (!current) throw err;
      const cookbook: CookbookSummary = { ...current, name: name.trim(), updatedAt: new Date().toISOString() };
      await saveCookbook(cookbook);
      await enqueue("PATCH", `/cookbooks/${id}`, { name: cookbook.name });
      void flushOutbox();
      return { cookbook };
    });
  }
}

export async function deleteCookbook(id: string) {
  try {
    await request<void>(`/cookbooks/${id}`, { method: "DELETE" });
    const { removeCookbook } = await import("../offline/store");
    await removeCookbook(id);
  } catch (err) {
    await offline(err, async () => {
      const { removeCookbook } = await import("../offline/store");
      const { enqueue, flushOutbox } = await import("../offline/sync");
      await removeCookbook(id);
      await enqueue("DELETE", `/cookbooks/${id}`, null);
      void flushOutbox();
    });
  }
}

export async function addRecipesToCookbook(id: string, recipeIds: string[]) {
  try {
    const live = await request<{ cookbook: CookbookDetail }>(`/cookbooks/${id}/recipes`, {
      method: "POST",
      body: JSON.stringify({ recipeIds }),
    });
    const { saveCookbook, setCookbookRecipes } = await import("../offline/store");
    const { upsertCachedRecipe } = await import("../db/cache");
    await saveCookbook(live.cookbook);
    await setCookbookRecipes(id, live.cookbook.recipes.map((recipe) => recipe.id));
    for (const recipe of live.cookbook.recipes) await upsertCachedRecipe(recipe);
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { cookbookRecipeIds, readCookbook, setCookbookRecipes } = await import("../offline/store");
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const existing = await cookbookRecipeIds(id);
      await setCookbookRecipes(id, [...new Set([...existing, ...recipeIds])]);
      const cookbook = await readCookbook(id);
      if (!cookbook) throw err;
      await enqueue("POST", `/cookbooks/${id}/recipes`, { recipeIds });
      void flushOutbox();
      return { cookbook };
    });
  }
}

export async function removeRecipeFromCookbook(id: string, recipeId: string) {
  try {
    await request<void>(`/cookbooks/${id}/recipes/${recipeId}`, { method: "DELETE" });
    const { cookbookRecipeIds, setCookbookRecipes } = await import("../offline/store");
    const existing = await cookbookRecipeIds(id);
    await setCookbookRecipes(id, existing.filter((item) => item !== recipeId));
  } catch (err) {
    await offline(err, async () => {
      const { cookbookRecipeIds, setCookbookRecipes } = await import("../offline/store");
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const existing = await cookbookRecipeIds(id);
      await setCookbookRecipes(id, existing.filter((item) => item !== recipeId));
      await enqueue("DELETE", `/cookbooks/${id}/recipes/${recipeId}`, null);
      void flushOutbox();
    });
  }
}

export async function listRecipeCookbooks(recipeId: string) {
  try {
    const live = await request<{ cookbookIds: string[] }>(`/recipes/${recipeId}/cookbooks`);
    const { setRecipeCookbookIds } = await import("../offline/store");
    await setRecipeCookbookIds(recipeId, live.cookbookIds);
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { recipeCookbookIds } = await import("../offline/store");
      return { cookbookIds: await recipeCookbookIds(recipeId) };
    });
  }
}

export async function setRecipeCookbooks(recipeId: string, cookbookIds: string[]) {
  try {
    const live = await request<{ cookbookIds: string[] }>(`/recipes/${recipeId}/cookbooks`, {
      method: "PUT",
      body: JSON.stringify({ cookbookIds }),
    });
    const { setRecipeCookbookIds } = await import("../offline/store");
    await setRecipeCookbookIds(recipeId, live.cookbookIds);
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { setRecipeCookbookIds } = await import("../offline/store");
      const { enqueue, flushOutbox } = await import("../offline/sync");
      await setRecipeCookbookIds(recipeId, cookbookIds);
      await enqueue("PUT", `/recipes/${recipeId}/cookbooks`, { cookbookIds });
      void flushOutbox();
      return { cookbookIds };
    });
  }
}

export function fetchPantry() {
  return request<PantryResponse>("/pantry");
}

export function setStarterInPantry(starterKey: string, inPantry: boolean) {
  return request<PantryResponse>(`/pantry/starters/${encodeURIComponent(starterKey)}`, {
    method: "PUT",
    body: JSON.stringify({ inPantry }),
  });
}

export function createPantryItem(displayName: string, aliases?: string[]) {
  return request<{ item: UserPantryItem }>("/pantry/items", {
    method: "POST",
    body: JSON.stringify({ displayName, aliases }),
  });
}

export function updatePantryItem(id: string, displayName: string, aliases?: string[]) {
  return request<{ item: UserPantryItem }>(`/pantry/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ displayName, aliases }),
  });
}

export function deletePantryItem(id: string) {
  return request<void>(`/pantry/items/${id}`, { method: "DELETE" });
}

export function fetchMealSuggestion(options: { category?: FoodCategory; excludeIds?: string[] }) {
  const params = new URLSearchParams();
  if (options.category) {
    params.set("category", options.category);
  }
  if (options.excludeIds?.length) {
    params.set("exclude", options.excludeIds.join(","));
  }
  const query = params.toString();
  return request<MealSuggestionResponse>(`/pantry/meal-suggestions${query ? `?${query}` : ""}`);
}

export function requestPantrySubstitutions(recipeId: string, options?: { displayServings?: number }) {
  return request<PantrySubstitutionResponse>(`/recipes/${encodeURIComponent(recipeId)}/pantry-substitutions`, {
    method: "POST",
    body: JSON.stringify(options ?? {}),
  });
}

export async function fetchNutritionProfile() {
  try {
    const live = await request<NutritionProfileResponse>("/nutrition/profile");
    const { saveProfile } = await import("../offline/store");
    await saveProfile(live);
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { readProfile } = await import("../offline/store");
      const profile = await readProfile();
      if (!profile) throw err;
      return profile;
    });
  }
}

export async function saveNutritionProfile(body: NutritionProfileInput) {
  try {
    const live = await request<NutritionProfileResponse>("/nutrition/profile", {
      method: "PUT",
      body: JSON.stringify(body),
    });
    const { saveProfile } = await import("../offline/store");
    await saveProfile(live);
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { computeNutritionTargets } = await import("@savorly/shared");
      const { saveProfile } = await import("../offline/store");
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const live: NutritionProfileResponse = {
        profile: { ...body, updatedAt: new Date().toISOString() },
        targets: computeNutritionTargets(body),
      };
      await saveProfile(live);
      await enqueue("PUT", "/nutrition/profile", body);
      void flushOutbox();
      return live;
    });
  }
}

export async function listNutritionFoods(q?: string) {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  try {
    const live = await request<{ foods: UserFood[] }>(`/nutrition/foods${query}`);
    if (!q) {
      const { saveFood } = await import("../offline/store");
      for (const food of live.foods) await saveFood(food);
    }
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { listFoodsLocal } = await import("../offline/store");
      return { foods: await listFoodsLocal(q) };
    });
  }
}

export async function fetchNutritionFood(id: string): Promise<{ food: UserFood; attribution?: string }> {
  try {
    const live = await request<{ food: UserFood; attribution?: string }>(`/nutrition/foods/${id}`);
    const { saveFood } = await import("../offline/store");
    await saveFood(live.food);
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { readFood } = await import("../offline/store");
      const food = await readFood(id);
      if (!food) throw err;
      return { food };
    });
  }
}

export async function createNutritionFood(name: string, per100g: NutrientVector) {
  try {
    const live = await request<{ food: UserFood }>("/nutrition/foods", {
      method: "POST",
      body: JSON.stringify({ name, per100g }),
    });
    const { saveFood } = await import("../offline/store");
    await saveFood(live.food);
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { localFood, newId, saveFood } = await import("../offline/store");
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const food = localFood({ id: newId(), name: name.trim(), per100g, source: "manual" });
      await saveFood(food);
      await enqueue("POST", "/nutrition/foods", { id: food.id, name: food.name, per100g });
      void flushOutbox();
      return { food };
    });
  }
}

export function searchUsdaFoods(q: string) {
  return request<{ foods: UsdaFoodHit[] }>(`/nutrition/foods/usda?q=${encodeURIComponent(q)}`);
}

export async function searchNevoFoods(q: string) {
  const { hasNevoSnapshot, NEVO_ATTRIBUTION, searchNevoLocal } = await import("../offline/store");
  if (await hasNevoSnapshot()) {
    return { foods: await searchNevoLocal(q), attribution: NEVO_ATTRIBUTION };
  }
  try {
    const live = await request<{ foods: NevoFoodHit[]; attribution: string }>(
      `/nutrition/foods/nevo?q=${encodeURIComponent(q)}`,
    );
    void ensureNevoSnapshot();
    return live;
  } catch (err) {
    return offline(err, async () => {
      throw err;
    });
  }
}

export async function ensureNevoSnapshot() {
  const { hasNevoSnapshot, saveNevoFoods } = await import("../offline/store");
  if (await hasNevoSnapshot()) return;
  const live = await request<{
    foods: Array<NevoFoodHit & { per100g: NutrientVector }>;
  }>("/nutrition/foods/nevo/snapshot");
  await saveNevoFoods(live.foods);
}

export function importUsdaFood(fdcId: number, name?: string) {
  return request<{ food: UserFood }>("/nutrition/foods/import", {
    method: "POST",
    body: JSON.stringify({ fdcId, name }),
  });
}

export function stapleFoodsStatus() {
  return request<{ imported: boolean }>("/nutrition/foods/staples");
}

export function importStapleFoods() {
  return request<{ imported: true; added: number }>("/nutrition/foods/staples", { method: "POST" });
}

export async function importNevoFood(nevoCode: number, name?: string) {
  try {
    const live = await request<{ food: UserFood; attribution: string }>("/nutrition/foods/import/nevo", {
      method: "POST",
      body: JSON.stringify({ nevoCode, name }),
    });
    const { saveFood } = await import("../offline/store");
    await saveFood(live.food);
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { localFood, newId, readNevoFood, saveFood, NEVO_ATTRIBUTION } = await import("../offline/store");
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const reference = await readNevoFood(nevoCode);
      if (!reference) throw err;
      const food = localFood({
        id: newId(),
        name: name?.trim() || reference.name,
        per100g: reference.per100g,
        source: "nevo",
        nevoCode,
      });
      await saveFood(food);
      await enqueue("POST", "/nutrition/foods/import/nevo", { id: food.id, nevoCode, name: food.name });
      void flushOutbox();
      return { food, attribution: NEVO_ATTRIBUTION };
    });
  }
}

export async function renameNutritionFood(id: string, name: string) {
  try {
    const live = await request<{ food: UserFood }>(`/nutrition/foods/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    const { saveFood } = await import("../offline/store");
    await saveFood(live.food);
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { readFood, saveFood } = await import("../offline/store");
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const current = await readFood(id);
      if (!current) throw err;
      const food = { ...current, name: name.trim(), updatedAt: new Date().toISOString() };
      await saveFood(food);
      await enqueue("PATCH", `/nutrition/foods/${id}`, { name: food.name });
      void flushOutbox();
      return { food };
    });
  }
}

export async function deleteNutritionFood(id: string) {
  try {
    await request<void>(`/nutrition/foods/${id}`, { method: "DELETE" });
    const { removeFood } = await import("../offline/store");
    await removeFood(id);
  } catch (err) {
    await offline(err, async () => {
      const { removeFood } = await import("../offline/store");
      const { enqueue, flushOutbox } = await import("../offline/sync");
      await removeFood(id);
      await enqueue("DELETE", `/nutrition/foods/${id}`, null);
      void flushOutbox();
    });
  }
}

export async function fetchDiaryDay(date: string) {
  try {
    const live = await requestDiaryDay(`/nutrition/diary?date=${encodeURIComponent(date)}`);
    const { saveDay } = await import("../offline/store");
    await saveDay(live);
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { readDay } = await import("../offline/store");
      const day = await readDay(date);
      if (!day) throw err;
      return day;
    });
  }
}

export async function createDiaryMeal(date: string, name: string) {
  try {
    const live = await requestDiaryDay("/nutrition/diary/meals", {
      method: "POST",
      body: JSON.stringify({ date, name }),
    });
    const { saveDay } = await import("../offline/store");
    await saveDay(live);
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const { mutateDay, newId } = await import("../offline/store");
      const id = newId();
      const day = await mutateDay(date, (current) => {
        if (current.meals.some((meal) => meal.name === name.trim())) return current;
        const sortOrder = current.meals.reduce((max, meal) => Math.max(max, meal.sortOrder), -1) + 1;
        return {
          ...current,
          meals: [
            ...current.meals,
            {
              id,
              date,
              name: name.trim(),
              sortOrder,
              totals: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
              entries: [],
            },
          ],
        };
      });
      await enqueue("POST", "/nutrition/diary/meals", { id, date, name: name.trim() });
      void flushOutbox();
      return day;
    });
  }
}

async function persistDay(path: string, init: RequestInit, dateHint?: string) {
  const live = await requestDiaryDay(path, init);
  const { saveDay } = await import("../offline/store");
  await saveDay(live);
  return live;
}

async function dayContainingMeal(mealId: string) {
  const { listDays } = await import("../offline/store");
  const days = await listDays();
  return days.find((day) => day.meals.some((meal) => meal.id === mealId)) ?? null;
}

export async function updateDiaryMeal(id: string, body: { name?: string; sortOrder?: number }) {
  try {
    return await persistDay(`/nutrition/diary/meals/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  } catch (err) {
    return offline(err, async () => {
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const { mutateDay } = await import("../offline/store");
      const current = await dayContainingMeal(id);
      if (!current) throw err;
      const day = await mutateDay(current.date, (day) => ({
        ...day,
        meals: day.meals.map((meal) =>
          meal.id === id
            ? { ...meal, name: body.name?.trim() || meal.name, sortOrder: body.sortOrder ?? meal.sortOrder }
            : meal,
        ),
      }));
      await enqueue("PATCH", `/nutrition/diary/meals/${id}`, body);
      void flushOutbox();
      return day;
    });
  }
}

export async function deleteDiaryMeal(id: string) {
  try {
    return await persistDay(`/nutrition/diary/meals/${id}`, { method: "DELETE" });
  } catch (err) {
    return offline(err, async () => {
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const { mutateDay } = await import("../offline/store");
      const current = await dayContainingMeal(id);
      if (!current) throw err;
      const day = await mutateDay(current.date, (day) => ({
        ...day,
        meals: day.meals.filter((meal) => meal.id !== id),
      }));
      await enqueue("DELETE", `/nutrition/diary/meals/${id}`, null);
      void flushOutbox();
      return day;
    });
  }
}

export async function copyPreviousDiaryMeal(id: string) {
  try {
    return await persistDay(`/nutrition/diary/meals/${id}/copy-previous`, { method: "POST" });
  } catch (err) {
    return offline(err, async () => {
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const { listDays, mutateDay, newId } = await import("../offline/store");
      const days = await listDays();
      const target = days.find((day) => day.meals.some((meal) => meal.id === id));
      const meal = target?.meals.find((item) => item.id === id);
      if (!target || !meal) throw err;
      const earlier = days
        .filter((day) => day.date < target.date)
        .sort((a, b) => b.date.localeCompare(a.date));
      const source = earlier
        .map((day) => day.meals.find((item) => item.name === meal.name && item.entries.length > 0))
        .find(Boolean);
      if (!source) throw new Error("No earlier meal with that name is on this phone.");
      const day = await mutateDay(target.date, (current) => ({
        ...current,
        meals: current.meals.map((item) => {
          if (item.id !== id) return item;
          return {
            ...item,
            entries: source.entries.map((entry) => ({ ...entry, id: newId(), date: target.date, mealId: id })),
          };
        }),
      }));
      await enqueue("POST", `/nutrition/diary/meals/${id}/copy-previous`, null);
      void flushOutbox();
      return day;
    });
  }
}

export async function logMealStaples(id: string) {
  try {
    return await persistDay(`/nutrition/diary/meals/${id}/staples`, { method: "POST" });
  } catch (err) {
    return offline(err, async () => {
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const { listDays, mutateDay, newId, readFood, scaledFoodEntry, stapleFoodIds } = await import("../offline/store");
      const target = await dayContainingMeal(id);
      const meal = target?.meals.find((item) => item.id === id);
      if (!target || !meal) throw err;
      const foodIds = await stapleFoodIds(meal.name);
      if (foodIds.length === 0) throw new Error("Those staples are not on this phone yet.");
      const days = await listDays();
      const entries: DiaryEntry[] = [];
      for (const foodId of foodIds) {
        const food = await readFood(foodId);
        if (!food) continue;
        const previous = days
          .flatMap((row) => row.meals.flatMap((group) => group.entries))
          .filter((entry) => entry.foodId === foodId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        entries.push(scaledFoodEntry(food, previous?.grams ?? 0, target.date, id, newId()));
      }
      if (entries.length === 0) throw new Error("Those staples are not on this phone yet.");
      const filled = await mutateDay(target.date, (current) => ({
        ...current,
        meals: current.meals.map((item) => (item.id === id ? { ...item, entries } : item)),
      }));
      await enqueue("POST", `/nutrition/diary/meals/${id}/staples`, null);
      void flushOutbox();
      return filled;
    });
  }
}

export async function fetchMealStaples(foodId: string) {
  try {
    const live = await request<{ mealNames: string[] }>(`/nutrition/foods/${foodId}/meal-staples`);
    const { replaceFoodStaples } = await import("../offline/store");
    await replaceFoodStaples(foodId, live.mealNames);
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { stapleNamesForFood } = await import("../offline/store");
      return { mealNames: await stapleNamesForFood(foodId) };
    });
  }
}

export async function setMealStaple(foodId: string, body: { mealName: string; enabled: boolean; date: string }) {
  try {
    const live = await request<{ mealNames: string[] }>(`/nutrition/foods/${foodId}/meal-staples`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    const { replaceFoodStaples } = await import("../offline/store");
    await replaceFoodStaples(foodId, live.mealNames);
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { replaceFoodStaples, stapleFoodIds, stapleNamesForFood } = await import("../offline/store");
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const names = new Set(await stapleNamesForFood(foodId));
      if (body.enabled) names.add(body.mealName);
      else names.delete(body.mealName);
      const mealNames = [...names];
      await replaceFoodStaples(foodId, mealNames);
      const count = (await stapleFoodIds(body.mealName)).length;
      const { listDays, mutateDay } = await import("../offline/store");
      for (const day of await listDays()) {
        if (!day.meals.some((meal) => meal.name === body.mealName)) continue;
        await mutateDay(day.date, (current) => ({
          ...current,
          meals: current.meals.map((meal) => (meal.name === body.mealName ? { ...meal, stapleCount: count } : meal)),
        }));
      }
      await enqueue("PUT", `/nutrition/foods/${foodId}/meal-staples`, body);
      void flushOutbox();
      return { mealNames };
    });
  }
}

export async function addDiaryEntry(mealId: string, foodId: string, grams: number, date: string) {
  try {
    return await persistDay("/nutrition/diary", {
      method: "POST",
      body: JSON.stringify({ mealId, foodId, grams, date }),
    });
  } catch (err) {
    return offline(err, async () => {
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const { mutateDay, newId, readFood, scaledFoodEntry } = await import("../offline/store");
      const food = await readFood(foodId);
      if (!food) throw err;
      const entryId = newId();
      const day = await mutateDay(date, (current) => ({
        ...current,
        meals: current.meals.map((meal) =>
          meal.id === mealId ? { ...meal, entries: [...meal.entries, scaledFoodEntry(food, grams, date, mealId, entryId)] } : meal,
        ),
      }));
      await enqueue("POST", "/nutrition/diary", { id: entryId, mealId, foodId, grams, date });
      void flushOutbox();
      return day;
    });
  }
}

export async function updateDiaryEntry(id: string, grams: number) {
  try {
    return await persistDay(`/nutrition/diary/${id}`, { method: "PATCH", body: JSON.stringify({ grams }) });
  } catch (err) {
    return offline(err, async () => {
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const { listDays, mutateDay, readFood } = await import("../offline/store");
      const { scaleNutrition } = await import("@savorly/shared");
      const days = await listDays();
      const host = days.find((day) => day.meals.some((meal) => meal.entries.some((entry) => entry.id === id)));
      if (!host) throw err;
      const day = await mutateDay(host.date, (current) => ({
        ...current,
        meals: current.meals.map((meal) => ({
          ...meal,
          entries: meal.entries.map((entry) => {
            if (entry.id !== id) return entry;
            return { ...entry, grams, nutrients: entry.kind === "food" ? entry.nutrients : entry.nutrients };
          }),
        })),
      }));
      const entry = day.meals.flatMap((meal) => meal.entries).find((item) => item.id === id);
      if (entry?.foodId) {
        const food = await readFood(entry.foodId);
        if (food) {
          const scaled = await mutateDay(host.date, (current) => ({
            ...current,
            meals: current.meals.map((meal) => ({
              ...meal,
              entries: meal.entries.map((item) =>
                item.id === id ? { ...item, grams, nutrients: scaleNutrition(food.per100g, grams) } : item,
              ),
            })),
          }));
          await enqueue("PATCH", `/nutrition/diary/${id}`, { grams });
          void flushOutbox();
          return scaled;
        }
      }
      await enqueue("PATCH", `/nutrition/diary/${id}`, { grams });
      void flushOutbox();
      return day;
    });
  }
}

export async function addQuickDiaryEntry(body: {
  mealId: string;
  date: string;
  label?: string;
  kcal: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}) {
  try {
    return await persistDay("/nutrition/diary/quick", { method: "POST", body: JSON.stringify(body) });
  } catch (err) {
    return offline(err, async () => {
      const { buildQuickDiaryNutrients } = await import("@savorly/shared");
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const { localEntry, mutateDay, newId } = await import("../offline/store");
      const entryId = newId();
      const day = await mutateDay(body.date, (current) => ({
        ...current,
        meals: current.meals.map((meal) =>
          meal.id === body.mealId
            ? {
                ...meal,
                entries: [
                  ...meal.entries,
                  localEntry({
                    id: entryId,
                    date: body.date,
                    mealId: body.mealId,
                    foodId: null,
                    foodName: body.label?.trim() || "Quick add",
                    label: body.label?.trim() || "Quick add",
                    grams: 0,
                    nutrients: buildQuickDiaryNutrients(body),
                    kind: "quick",
                  }),
                ],
              }
            : meal,
        ),
      }));
      await enqueue("POST", "/nutrition/diary/quick", { id: entryId, ...body });
      void flushOutbox();
      return day;
    });
  }
}

export function updateQuickDiaryEntry(
  id: string,
  body: {
    label?: string;
    kcal: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
  },
) {
  return requestDiaryDay(`/nutrition/diary/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteDiaryEntry(id: string) {
  try {
    return await persistDay(`/nutrition/diary/${id}`, { method: "DELETE" });
  } catch (err) {
    return offline(err, async () => {
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const { listDays, mutateDay } = await import("../offline/store");
      const host = (await listDays()).find((day) => day.meals.some((meal) => meal.entries.some((entry) => entry.id === id)));
      if (!host) throw err;
      const day = await mutateDay(host.date, (current) => ({
        ...current,
        meals: current.meals.map((meal) => ({ ...meal, entries: meal.entries.filter((entry) => entry.id !== id) })),
      }));
      await enqueue("DELETE", `/nutrition/diary/${id}`, null);
      void flushOutbox();
      return day;
    });
  }
}

export async function copyDiaryEntry(id: string, mealId: string) {
  try {
    return await persistDay(`/nutrition/diary/${id}/copy`, { method: "POST", body: JSON.stringify({ mealId }) });
  } catch (err) {
    return offline(err, async () => {
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const { listDays, mutateDay, newId } = await import("../offline/store");
      const days = await listDays();
      const source = days.flatMap((day) => day.meals.flatMap((meal) => meal.entries)).find((entry) => entry.id === id);
      const host = days.find((day) => day.meals.some((meal) => meal.id === mealId));
      if (!source || !host) throw err;
      const copyId = newId();
      const day = await mutateDay(host.date, (current) => ({
        ...current,
        meals: current.meals.map((meal) =>
          meal.id === mealId
            ? { ...meal, entries: [...meal.entries, { ...source, id: copyId, mealId, date: host.date }] }
            : meal,
        ),
      }));
      await enqueue("POST", `/nutrition/diary/${id}/copy`, { mealId });
      void flushOutbox();
      return day;
    });
  }
}

export async function copyDiaryEntries(entryIds: string[], mealId: string): Promise<DiaryDayResponse> {
  let day: DiaryDayResponse | null = null;
  for (const id of entryIds) {
    day = await copyDiaryEntry(id, mealId);
  }
  if (!day) {
    throw new ApiRequestError("validation_error", "Pick a food to copy.");
  }
  return day;
}

export async function fetchFrequentGrams(foodId: string) {
  try {
    return await request<{ grams: number[] }>(`/nutrition/foods/${foodId}/frequent-grams`);
  } catch (err) {
    return offline(err, async () => {
      const { listDays } = await import("../offline/store");
      const counts = new Map<number, number>();
      for (const day of await listDays()) {
        for (const meal of day.meals) {
          for (const entry of meal.entries) {
            if (entry.foodId !== foodId || entry.grams <= 0) continue;
            counts.set(entry.grams, (counts.get(entry.grams) ?? 0) + 1);
          }
        }
      }
      const grams = [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || b[0] - a[0])
        .slice(0, 3)
        .map(([value]) => value);
      return { grams };
    });
  }
}

export type NutritionRecipeDetail = {
  id: string;
  sourceRecipeId: string | null;
  title: string;
  servings: number;
  cookedWeightG: number | null;
  items: Array<{
    id: string;
    sourceLine: string;
    foodId: string | null;
    foodName?: string | null;
    grams: number | null;
  }>;
  ingredientGramsTotal: number;
  recipeWeightG: number;
  totals: NutrientVector;
  perServing: NutrientVector;
  complete: boolean;
  libraryFood: UserFood | null;
};

async function rememberRecipe(detail: NutritionRecipeDetail): Promise<NutritionRecipeDetail> {
  const { saveFood, saveNutritionRecipe } = await import("../offline/store");
  await saveNutritionRecipe(detail);
  if (detail.libraryFood) await saveFood(detail.libraryFood);
  return detail;
}

function blankNutritionRecipe(id: string, title: string): NutritionRecipeDetail {
  const zeros = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  return {
    id,
    sourceRecipeId: null,
    title,
    servings: 1,
    cookedWeightG: null,
    items: [],
    ingredientGramsTotal: 0,
    recipeWeightG: 0,
    totals: zeros,
    perServing: zeros,
    complete: false,
    libraryFood: null,
  };
}

async function editNutritionRecipe(
  id: string,
  path: string,
  init: RequestInit,
  patch: (current: NutritionRecipeDetail) => NutritionRecipeDetail | Promise<NutritionRecipeDetail>,
): Promise<NutritionRecipeDetail> {
  try {
    return await rememberRecipe(await request<NutritionRecipeDetail>(path, init));
  } catch (err) {
    return offline(err, async () => {
      const { readNutritionRecipe, saveNutritionRecipe } = await import("../offline/store");
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const current = await readNutritionRecipe<NutritionRecipeDetail>(id);
      if (!current) throw err;
      const next = await patch(current);
      await saveNutritionRecipe(next);
      await enqueue(init.method ?? "POST", path, init.body ? JSON.parse(String(init.body)) : null);
      void flushOutbox();
      return next;
    });
  }
}

export async function listNutritionRecipesForCookbook(sourceRecipeId: string) {
  try {
    const live = await request<{ foods: UserFood[]; recipes: { id: string; title: string }[] }>(
      `/nutrition/recipes?sourceRecipeId=${encodeURIComponent(sourceRecipeId)}`,
    );
    const { saveFood } = await import("../offline/store");
    for (const food of live.foods) await saveFood(food);
    return live;
  } catch (err) {
    return offline(err, async () => {
      const { listFoodsLocal, listNutritionRecipesLocal } = await import("../offline/store");
      const recipes = (await listNutritionRecipesLocal()).filter((recipe) => recipe.sourceRecipeId === sourceRecipeId);
      const foods = (await listFoodsLocal()).filter((food) =>
        recipes.some((recipe) => recipe.id === food.nutritionRecipeId),
      );
      return { foods, recipes: recipes.map((recipe) => ({ id: recipe.id, title: recipe.title })) };
    });
  }
}

export async function createNutritionRecipe(title: string) {
  try {
    return await rememberRecipe(
      await request<NutritionRecipeDetail>("/nutrition/recipes", {
        method: "POST",
        body: JSON.stringify({ title }),
      }),
    );
  } catch (err) {
    return offline(err, async () => {
      const { newId, saveNutritionRecipe } = await import("../offline/store");
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const detail = blankNutritionRecipe(newId(), title.trim());
      await saveNutritionRecipe(detail);
      await enqueue("POST", "/nutrition/recipes", { id: detail.id, title: detail.title });
      void flushOutbox();
      return detail;
    });
  }
}

export async function createNutritionRecipeFromCookbook(recipeId: string) {
  try {
    return await rememberRecipe(
      await request<NutritionRecipeDetail>("/nutrition/recipes/from-cookbook", {
        method: "POST",
        body: JSON.stringify({ recipeId }),
      }),
    );
  } catch (err) {
    return offline(err, async () => {
      throw new Error("Turning a cookbook recipe into a diary recipe needs a connection.");
    });
  }
}

export async function fetchNutritionRecipe(id: string) {
  try {
    return await rememberRecipe(await request<NutritionRecipeDetail>(`/nutrition/recipes/${id}`));
  } catch (err) {
    return offline(err, async () => {
      const { readNutritionRecipe } = await import("../offline/store");
      const detail = await readNutritionRecipe<NutritionRecipeDetail>(id);
      if (!detail) throw err;
      return detail;
    });
  }
}

export function updateNutritionRecipe(
  id: string,
  body: { title?: string; servings?: number; cookedWeightG?: number | null; sourceRecipeId?: string | null },
) {
  return editNutritionRecipe(id, `/nutrition/recipes/${id}`, { method: "PATCH", body: JSON.stringify(body) }, (current) => ({
    ...current,
    ...body,
    title: body.title ?? current.title,
  }));
}

export function updateNutritionRecipeItem(
  recipeId: string,
  itemId: string,
  body: { foodId?: string | null; grams?: number | null },
) {
  return editNutritionRecipe(
    recipeId,
    `/nutrition/recipes/${recipeId}/items/${itemId}`,
    { method: "PATCH", body: JSON.stringify(body) },
    async (current) => {
      const { readFood } = await import("../offline/store");
      const food = body.foodId ? await readFood(body.foodId) : null;
      return {
        ...current,
        items: current.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                foodId: body.foodId === undefined ? item.foodId : body.foodId,
                grams: body.grams === undefined ? item.grams : body.grams,
                foodName: body.foodId === undefined ? item.foodName : food?.name ?? null,
              }
            : item,
        ),
      };
    },
  );
}

export function addNutritionRecipeItem(recipeId: string, foodId: string, grams: number) {
  return editNutritionRecipe(
    recipeId,
    `/nutrition/recipes/${recipeId}/items`,
    { method: "POST", body: JSON.stringify({ foodId, grams }) },
    async (current) => {
      const { newId, readFood } = await import("../offline/store");
      const food = await readFood(foodId);
      return {
        ...current,
        items: [
          ...current.items,
          { id: newId(), sourceLine: food?.name ?? "", foodId, foodName: food?.name ?? null, grams },
        ],
      };
    },
  );
}

export function deleteNutritionRecipeItem(recipeId: string, itemId: string) {
  return editNutritionRecipe(
    recipeId,
    `/nutrition/recipes/${recipeId}/items/${itemId}`,
    { method: "DELETE" },
    (current) => ({ ...current, items: current.items.filter((item) => item.id !== itemId) }),
  );
}

export async function publishNutritionRecipe(id: string) {
  try {
    return await rememberRecipe(await request<NutritionRecipeDetail>(`/nutrition/recipes/${id}/publish`, { method: "POST" }));
  } catch (err) {
    return offline(err, async () => {
      const { localFood, newId, readNutritionRecipe, saveFood, saveNutritionRecipe } = await import("../offline/store");
      const { enqueue, flushOutbox } = await import("../offline/sync");
      const current = await readNutritionRecipe<NutritionRecipeDetail & { per100g?: NutrientVector }>(id);
      if (!current?.complete || !current.per100g) {
        throw new Error("Saving this recipe to My foods needs a connection.");
      }
      const food = localFood({ id: current.libraryFood?.id ?? newId(), name: current.title, per100g: current.per100g, source: "recipe" });
      food.nutritionRecipeId = id;
      await saveFood(food);
      const next = { ...current, libraryFood: food };
      await saveNutritionRecipe(next);
      await enqueue("POST", `/nutrition/recipes/${id}/publish`, null);
      void flushOutbox();
      return next;
    });
  }
}
