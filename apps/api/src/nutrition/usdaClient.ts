import type { NutrientVector, UsdaFoodHit } from "@savorly/shared";
import type { Env } from "../config";
import { AppError } from "../errors";
import { getMockUsdaFood, searchMockUsdaFoods } from "./mockUsda";
import { fdcFoodName, mapFdcFoodToNutrients, mapFdcSearchHits } from "./usdaMapper";

const FDC_BASE = "https://api.nal.usda.gov/fdc/v1";

export type ImportedUsdaFood = {
  fdcId: number;
  name: string;
  per100g: NutrientVector;
};

export async function searchUsdaFoods(query: string, env: Env): Promise<UsdaFoodHit[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new AppError("validation_error", "Search for a food name.", 400);
  }

  if (!env.usdaFdcApiKey) {
    return searchMockUsdaFoods(trimmed);
  }

  const url = new URL(`${FDC_BASE}/foods/search`);
  url.searchParams.set("api_key", env.usdaFdcApiKey);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: trimmed,
      dataType: ["Foundation", "SR Legacy"],
      pageSize: 10,
    }),
  });

  if (!response.ok) {
    throw new AppError("internal_error", "Could not search USDA foods.", 500);
  }

  const data = (await response.json()) as { foods?: unknown[] };
  return mapFdcSearchHits(Array.isArray(data.foods) ? data.foods : []);
}

export async function fetchUsdaFood(fdcId: number, env: Env, name?: string): Promise<ImportedUsdaFood> {
  if (!env.usdaFdcApiKey) {
    const mock = getMockUsdaFood(fdcId);
    if (!mock) {
      throw new AppError("not_found", "That USDA food is not in the local staple list.", 404);
    }
    return { fdcId: mock.fdcId, name: name?.trim() || mock.name, per100g: mock.per100g };
  }

  const url = new URL(`${FDC_BASE}/food/${fdcId}`);
  url.searchParams.set("api_key", env.usdaFdcApiKey);
  url.searchParams.set("format", "full");
  const response = await fetch(url);

  if (response.status === 404) {
    throw new AppError("not_found", "USDA food not found.", 404);
  }
  if (!response.ok) {
    throw new AppError("internal_error", "Could not load that USDA food.", 500);
  }

  const food = (await response.json()) as { fdcId?: number; description?: string; foodNutrients?: unknown[] };
  try {
    return {
      fdcId,
      name: fdcFoodName(food, name),
      per100g: mapFdcFoodToNutrients(food),
    };
  } catch (error) {
    throw new AppError(
      "validation_error",
      error instanceof Error ? error.message : "USDA food is missing nutrition data.",
      400,
    );
  }
}
