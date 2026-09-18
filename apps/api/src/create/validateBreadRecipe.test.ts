import { describe, expect, it } from "vitest";
import type { BreadGenerateRequest, GeneratedRecipe } from "@savorly/shared";
import { normalizeBreadRecipe } from "./validateBreadRecipe";

const request: BreadGenerateRequest = {
  agent: "bread",
  size: "large",
  style: "regular",
};

function recipe(overrides: Partial<GeneratedRecipe> = {}): GeneratedRecipe {
  return {
    title: "Honey oat loaf",
    category: "bread",
    servings: null,
    ingredients: [{ name: "flour", quantity: 570, unit: "g", notes: null }],
    steps: [
      {
        order: 1,
        text: "Use the Basic program, Large (1000 g). Load: liquids → dry → yeast last.",
        durationMinutes: null,
        temperatureC: null,
      },
    ],
    tags: ["bread", "basic"],
    uncertainties: [],
    nutrition: {
      servingG: 40,
      perServing: { kcal: 110, proteinG: 4, carbsG: 20, fatG: 1.5 },
      perPint: { kcal: 1760, proteinG: 64, carbsG: 320, fatG: 24 },
    },
    source: { type: "manual", sourceName: "Bread" },
    ...overrides,
  };
}

describe("normalizeBreadRecipe", () => {
  it("defaults missing servings from loaf size", () => {
    expect(normalizeBreadRecipe(recipe(), request).servings).toBe(16);
    expect(normalizeBreadRecipe(recipe({ servings: 12 }), request).servings).toBe(12);
    expect(normalizeBreadRecipe(recipe(), { ...request, size: "medium" }).servings).toBe(12);
  });

  it("keeps steps and per-serving macros without a pint", () => {
    const normalized = normalizeBreadRecipe(recipe(), request);
    expect(normalized.steps).toHaveLength(1);
    expect(normalized.nutrition).toEqual({
      servingG: 40,
      perServing: { kcal: 110, proteinG: 4, carbsG: 20, fatG: 1.5 },
    });
    expect(normalized.nutrition?.perPint).toBeUndefined();
  });

  it("fills a missing serving weight with a slice", () => {
    expect(
      normalizeBreadRecipe(
        recipe({
          nutrition: { servingG: 0, perServing: { kcal: 110, proteinG: 4, carbsG: 20, fatG: 1.5 } },
        }),
        request,
      ).nutrition?.servingG,
    ).toBe(40);
  });

  it("leaves missing nutrition null", () => {
    expect(normalizeBreadRecipe(recipe({ nutrition: null }), request).nutrition).toBeNull();
  });
});
