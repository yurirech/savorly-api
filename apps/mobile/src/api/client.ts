import type {
  ApiErrorBody,
  AuthResponse,
  CookbookDetail,
  CookbookSummary,
  GeneratedRecipe,
  MealSuggestionResponse,
  PantryResponse,
  PantrySubstitutionResponse,
  FoodCategory,
  RecipeGenerateRequest,
  RecipeImportRequest,
  SavedRecipe,
  UserPantryItem,
} from "@savorly/shared";
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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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
          ? "This API does not have cookbooks yet. Use the local API or deploy the latest backend."
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

export function listRecipes(q?: string) {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return request<{ recipes: SavedRecipe[] }>(`/recipes${query}`);
}

export function createRecipe(recipe: GeneratedRecipe) {
  return request<{ recipe: SavedRecipe }>("/recipes", {
    method: "POST",
    body: JSON.stringify(recipe),
  });
}

export function getRecipe(id: string) {
  return request<{ recipe: SavedRecipe }>(`/recipes/${id}`);
}

export function deleteRecipe(id: string) {
  return request<void>(`/recipes/${id}`, { method: "DELETE" });
}

export function updateRecipe(id: string, recipe: GeneratedRecipe) {
  return request<{ recipe: SavedRecipe }>(`/recipes/${id}`, {
    method: "PUT",
    body: JSON.stringify(recipe),
  });
}

export function listCookbooks() {
  return request<{ cookbooks: CookbookSummary[] }>("/cookbooks");
}

export function createCookbook(name: string) {
  return request<{ cookbook: CookbookSummary }>("/cookbooks", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function getCookbook(id: string) {
  return request<{ cookbook: CookbookDetail }>(`/cookbooks/${id}`);
}

export function updateCookbook(id: string, name: string) {
  return request<{ cookbook: CookbookSummary }>(`/cookbooks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function deleteCookbook(id: string) {
  return request<void>(`/cookbooks/${id}`, { method: "DELETE" });
}

export function addRecipesToCookbook(id: string, recipeIds: string[]) {
  return request<{ cookbook: CookbookDetail }>(`/cookbooks/${id}/recipes`, {
    method: "POST",
    body: JSON.stringify({ recipeIds }),
  });
}

export function removeRecipeFromCookbook(id: string, recipeId: string) {
  return request<void>(`/cookbooks/${id}/recipes/${recipeId}`, { method: "DELETE" });
}

export function listRecipeCookbooks(recipeId: string) {
  return request<{ cookbookIds: string[] }>(`/recipes/${recipeId}/cookbooks`);
}

export function setRecipeCookbooks(recipeId: string, cookbookIds: string[]) {
  return request<{ cookbookIds: string[] }>(`/recipes/${recipeId}/cookbooks`, {
    method: "PUT",
    body: JSON.stringify({ cookbookIds }),
  });
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
