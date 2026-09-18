import { describe, expect, it } from "vitest";
import type { ChefGenerateRequest, GeneratedRecipe } from "@savorly/shared";
import { normalizeChefRecipe } from "./validateChefRecipe";

const request: ChefGenerateRequest = {
  agent: "chef",
  mealType: "main",
  servings: 2,
  style: "regular",
};

function recipe(overrides: Partial<GeneratedRecipe> = {}): GeneratedRecipe {
  return {
    title: "Mushroom pasta",
    category: "pasta",
    servings: null,
    ingredients: [{ name: "pasta", quantity: 180, unit: "g", notes: null }],
    steps: [{ order: 1, text: "Boil the pasta.", durationMinutes: 10, temperatureC: null }],
    tags: ["chef"],
    uncertainties: [],
    nutrition: {
      servingG: 400,
      perServing: { kcal: 400, proteinG: 20, carbsG: 50, fatG: 12 },
      perPint: { kcal: 800, proteinG: 40, carbsG: 100, fatG: 24 },
    },
    source: { type: "manual", sourceName: "Chef" },
    ...overrides,
  };
}

describe("normalizeChefRecipe", () => {
  it("defaults missing servings from the request", () => {
    expect(normalizeChefRecipe(recipe(), request).servings).toBe(2);
    expect(normalizeChefRecipe(recipe({ servings: 4 }), request).servings).toBe(4);
  });

  it("keeps steps and per-serving macros without a pint", () => {
    const normalized = normalizeChefRecipe(recipe(), request);
    expect(normalized.steps).toHaveLength(1);
    expect(normalized.nutrition).toEqual({
      servingG: 400,
      perServing: { kcal: 400, proteinG: 20, carbsG: 50, fatG: 12 },
    });
    expect(normalized.nutrition?.perPint).toBeUndefined();
  });

  it("fills a missing serving weight from the meal type", () => {
    expect(
      normalizeChefRecipe(
        recipe({
          nutrition: { servingG: 0, perServing: { kcal: 400, proteinG: 20, carbsG: 50, fatG: 12 } },
        }),
        request,
      ).nutrition?.servingG,
    ).toBe(450);
  });

  it("leaves missing nutrition null", () => {
    expect(normalizeChefRecipe(recipe({ nutrition: null }), request).nutrition).toBeNull();
  });
});
