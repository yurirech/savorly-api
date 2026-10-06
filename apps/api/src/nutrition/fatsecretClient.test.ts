import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../config";
import { fetchFatsecretFood, resetFatsecretTokenCache, searchFatsecretFoods } from "./fatsecretClient";

const env: Env = {
  port: 4000,
  databaseUrl: "postgres://local",
  jwtSecret: "test-secret",
  geminiModel: "gemini-3.5-flash-lite",
  apifyInstagramActor: "apify/instagram-reel-scraper",
  apifyYoutubeActor: "autofacts/youtube-subtitle-transcript-scraper",
  apifyYoutubeLanguages: ["en"],
  useMockImports: false,
  fatsecretClientId: "id",
  fatsecretClientSecret: "secret",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fatsecretClient", () => {
  beforeEach(() => {
    resetFatsecretTokenCache();
    vi.restoreAllMocks();
  });

  it("searches FatSecret foods", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("connect/token")) {
        return jsonResponse({ access_token: "token", expires_in: 86400 });
      }
      return jsonResponse({
        foods: {
          food: {
            food_id: "33691",
            food_name: "Apple",
            food_type: "Generic",
          },
        },
      });
    });

    const hits = await searchFatsecretFoods("apple", env);
    expect(hits).toEqual([{ foodId: 33691, name: "Apple", foodType: "Generic" }]);
  });

  it("maps a 100 g serving to per-100g nutrients", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("connect/token")) {
        return jsonResponse({ access_token: "token", expires_in: 86400 });
      }
      return jsonResponse({
        food: {
          food_name: "Banana",
          servings: {
            serving: {
              calories: "89",
              protein: "1.1",
              carbohydrate: "22.8",
              fat: "0.3",
              fiber: "2.6",
              metric_serving_amount: "100.000",
              metric_serving_unit: "g",
            },
          },
        },
      });
    });

    const food = await fetchFatsecretFood(9040, env);
    expect(food).toMatchObject({
      foodId: 9040,
      name: "Banana",
      per100g: { kcal: 89, proteinG: 1.1, carbsG: 22.8, fatG: 0.3, fiberG: 2.6 },
    });
  });

  it("scales a non-100 g serving to 100 g", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("connect/token")) {
        return jsonResponse({ access_token: "token", expires_in: 86400 });
      }
      return jsonResponse({
        food: {
          food_name: "Cheese",
          servings: {
            serving: {
              calories: "113",
              protein: "7",
              carbohydrate: "1",
              fat: "9",
              metric_serving_amount: "28.000",
              metric_serving_unit: "g",
            },
          },
        },
      });
    });

    const food = await fetchFatsecretFood(1001, env, "Cheddar");
    expect(food.name).toBe("Cheddar");
    expect(food.per100g.kcal).toBe(404);
    expect(food.per100g.proteinG).toBe(25);
    expect(food.per100g.fatG).toBe(32.1);
  });

  it("fails when FatSecret is not configured", async () => {
    await expect(searchFatsecretFoods("apple", { ...env, fatsecretClientId: undefined })).rejects.toMatchObject({
      code: "internal_error",
      status: 503,
    });
  });
});
