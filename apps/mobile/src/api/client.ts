import type {
  ApiErrorBody,
  AuthResponse,
  GeneratedRecipe,
  RecipeImportRequest,
  SavedRecipe,
} from "@savorly/shared";
import { getToken } from "../auth/session";

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

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json()) as T & ApiErrorBody;
  if (!response.ok) {
    throw new ApiRequestError(
      data.error?.code ?? "internal_error",
      data.error?.message ?? "Request failed",
      Boolean(data.error?.offerTextPaste),
    );
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

export function updateRecipe(id: string, recipe: GeneratedRecipe) {
  return request<{ recipe: SavedRecipe }>(`/recipes/${id}`, {
    method: "PUT",
    body: JSON.stringify(recipe),
  });
}
