import { roundNutrition, type FatsecretFoodHit, type NutrientVector } from "@savorly/shared";
import type { Env } from "../config";
import { AppError } from "../errors";

const TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const API_URL = "https://platform.fatsecret.com/rest/server.api";

export type ImportedFatsecretFood = {
  foodId: number;
  name: string;
  per100g: NutrientVector;
};

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

export function resetFatsecretTokenCache(): void {
  tokenCache = null;
}

export async function searchFatsecretFoods(query: string, env: Env): Promise<FatsecretFoodHit[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new AppError("validation_error", "Search for a food name.", 400);
  }

  const token = await fatsecretToken(env);
  const url = new URL(API_URL);
  url.searchParams.set("method", "foods.search");
  url.searchParams.set("search_expression", trimmed);
  url.searchParams.set("format", "json");
  url.searchParams.set("max_results", "10");
  const data = await fatsecretGet<FatsecretSearchResponse>(url, token);
  return asArray(data.foods?.food).flatMap(mapSearchHit).slice(0, 10);
}

export async function fetchFatsecretFood(foodId: number, env: Env, name?: string): Promise<ImportedFatsecretFood> {
  if (!(foodId > 0)) {
    throw new AppError("validation_error", "FatSecret food is missing.", 400);
  }
  const token = await fatsecretToken(env);
  const url = new URL(API_URL);
  url.searchParams.set("method", "food.get.v2");
  url.searchParams.set("food_id", String(foodId));
  url.searchParams.set("format", "json");
  const data = await fatsecretGet<FatsecretFoodResponse>(url, token);
  const food = data.food;
  if (!food) {
    throw new AppError("not_found", "FatSecret food not found.", 404);
  }
  try {
    return {
      foodId,
      name: name?.trim() || food.food_name || `FatSecret ${foodId}`,
      per100g: mapFatsecretServings(food.servings?.serving),
    };
  } catch (error) {
    throw new AppError(
      "validation_error",
      error instanceof Error ? error.message : "FatSecret food is missing nutrition data.",
      400,
    );
  }
}

async function fatsecretToken(env: Env): Promise<string> {
  if (!env.fatsecretClientId || !env.fatsecretClientSecret) {
    throw new AppError("internal_error", "FatSecret is not configured on this server.", 503);
  }
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.accessToken;
  }

  const credentials = Buffer.from(`${env.fatsecretClientId}:${env.fatsecretClientSecret}`).toString("base64");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=basic",
  });
  if (!response.ok) {
    throw new AppError("internal_error", "Could not sign in to FatSecret.", 502);
  }
  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new AppError("internal_error", "Could not sign in to FatSecret.", 502);
  }
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Math.max(60, data.expires_in ?? 86400) * 1000,
  };
  return tokenCache.accessToken;
}

async function fatsecretGet<T>(url: URL, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) {
    throw new AppError("not_found", "FatSecret food not found.", 404);
  }
  if (!response.ok) {
    throw new AppError("internal_error", "Could not reach FatSecret.", 502);
  }
  return (await response.json()) as T;
}

function mapSearchHit(row: FatsecretSearchFood): FatsecretFoodHit[] {
  const foodId = Number(row.food_id);
  const name = row.food_name?.trim();
  if (!Number.isFinite(foodId) || foodId <= 0 || !name) {
    return [];
  }
  return [
    {
      foodId,
      name,
      brandName: row.brand_name?.trim() || undefined,
      foodType: row.food_type?.trim() || "Generic",
    },
  ];
}

function mapFatsecretServings(raw: FatsecretServing | FatsecretServing[] | undefined): NutrientVector {
  const servings = asArray(raw);
  const serving =
    servings.find((row) => metricGrams(row) === 100) ??
    servings.find((row) => metricGrams(row) != null) ??
    servings[0];
  if (!serving) {
    throw new Error("FatSecret food is missing a serving.");
  }
  const grams = metricGrams(serving) ?? 100;
  if (!(grams > 0)) {
    throw new Error("FatSecret food is missing a serving weight.");
  }
  const factor = 100 / grams;
  const kcal = num(serving.calories);
  const proteinG = num(serving.protein);
  const carbsG = num(serving.carbohydrate);
  const fatG = num(serving.fat);
  if (kcal == null || proteinG == null || carbsG == null || fatG == null) {
    throw new Error("FatSecret food is missing nutrition data.");
  }
  return {
    kcal: roundNutrition(kcal * factor, 0),
    proteinG: roundNutrition(proteinG * factor),
    carbsG: roundNutrition(carbsG * factor),
    fatG: roundNutrition(fatG * factor),
    saturatedFatG: scaleOptional(serving.saturated_fat, factor),
    transFatG: scaleOptional(serving.trans_fat, factor),
    monoFatG: scaleOptional(serving.monounsaturated_fat, factor),
    fiberG: scaleOptional(serving.fiber, factor),
    sugarsG: scaleOptional(serving.sugar, factor),
    cholesterolMg: scaleOptional(serving.cholesterol, factor),
    sodiumMg: scaleOptional(serving.sodium, factor),
    potassiumMg: scaleOptional(serving.potassium, factor),
    calciumMg: scaleOptional(serving.calcium, factor),
    ironMg: scaleOptional(serving.iron, factor),
    vitaminAMcgRae: scaleOptional(serving.vitamin_a, factor),
    vitaminCMg: scaleOptional(serving.vitamin_c, factor),
    vitaminDMcg: scaleOptional(serving.vitamin_d, factor),
  };
}

function metricGrams(serving: FatsecretServing): number | null {
  const amount = num(serving.metric_serving_amount);
  const unit = serving.metric_serving_unit?.trim().toLowerCase();
  if (amount == null || amount <= 0) return null;
  if (unit === "g" || unit === "ml") return amount;
  if (unit === "oz") return amount * 28.3495;
  return null;
}

function scaleOptional(value: unknown, factor: number): number | null {
  const amount = num(value);
  return amount == null ? null : roundNutrition(amount * factor);
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

type FatsecretSearchFood = {
  food_id?: string;
  food_name?: string;
  brand_name?: string;
  food_type?: string;
};

type FatsecretSearchResponse = {
  foods?: { food?: FatsecretSearchFood | FatsecretSearchFood[] };
};

type FatsecretServing = {
  calories?: string;
  carbohydrate?: string;
  protein?: string;
  fat?: string;
  saturated_fat?: string;
  trans_fat?: string;
  monounsaturated_fat?: string;
  fiber?: string;
  sugar?: string;
  cholesterol?: string;
  sodium?: string;
  potassium?: string;
  calcium?: string;
  iron?: string;
  vitamin_a?: string;
  vitamin_c?: string;
  vitamin_d?: string;
  metric_serving_amount?: string;
  metric_serving_unit?: string;
};

type FatsecretFoodResponse = {
  food?: {
    food_name?: string;
    servings?: { serving?: FatsecretServing | FatsecretServing[] };
  };
};
