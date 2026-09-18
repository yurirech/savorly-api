import { describe, expect, it } from "vitest";
import type { BakeGenerateRequest, GeneratedRecipe } from "@savorly/shared";
import { normalizeBakeRecipe } from "./validateBakeRecipe";

const request: BakeGenerateRequest = {
  agent: "bake",
  kind: "cake",
  style: "regular",
};

function recipe(overrides: Partial<GeneratedRecipe> = {}): GeneratedRecipe {
  return {
    title: "Strawberry lemon chiffon",
    category: "dessert",
    servings: null,
    ingredients: [{ name: "cake flour", quantity: 200, unit: "g", notes: null }],
    steps: [{ order: 1, text: "Heat the oven to 170 °C / 340 °F.", durationMinutes: null, temperatureC: 170 }],
    tags: ["bake", "cake"],
    uncertainties: [],
    nutrition: {
      servingG: 90,
      perServing: { kcal: 280, proteinG: 5, carbsG: 38, fatG: 12 },
      perPint: { kcal: 3360, proteinG: 60, carbsG: 456, fatG: 144 },
    },
    source: { type: "manual", sourceName: "Bake" },
    ...overrides,
  };
}

describe("normalizeBakeRecipe", () => {
  it("defaults missing servings from bake kind", () => {
    expect(normalizeBakeRecipe(recipe(), request).servings).toBe(12);
    expect(normalizeBakeRecipe(recipe({ servings: 8 }), request).servings).toBe(8);
    expect(normalizeBakeRecipe(recipe(), { ...request, kind: "other" }).servings).toBe(8);
  });

  it("keeps steps and per-serving macros without a pint", () => {
    const normalized = normalizeBakeRecipe(recipe(), request);
    expect(normalized.steps).toHaveLength(1);
    expect(normalized.nutrition).toEqual({
      servingG: 90,
      perServing: { kcal: 280, proteinG: 5, carbsG: 38, fatG: 12 },
    });
    expect(normalized.nutrition?.perPint).toBeUndefined();
  });

  it("fills a missing serving weight from the bake kind", () => {
    expect(
      normalizeBakeRecipe(
        recipe({
          nutrition: { servingG: 0, perServing: { kcal: 280, proteinG: 5, carbsG: 38, fatG: 12 } },
        }),
        { ...request, kind: "muffin" },
      ).nutrition?.servingG,
    ).toBe(70);
  });

  it("leaves missing nutrition null", () => {
    expect(normalizeBakeRecipe(recipe({ nutrition: null }), request).nutrition).toBeNull();
  });
});
