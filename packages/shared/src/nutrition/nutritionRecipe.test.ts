import { describe, expect, it } from "vitest";
import { computeNutritionRecipe, isNutritionRecipeComplete } from "./nutritionRecipe";
import type { NutrientVector } from "./nutrients";

const oats: NutrientVector = { kcal: 380, proteinG: 13, carbsG: 60, fatG: 7 };

describe("computeNutritionRecipe", () => {
  it("sums mapped lines and derives per serving and per 100 g", () => {
    const result = computeNutritionRecipe({
      servings: 2,
      cookedWeightG: null,
      items: [
        { id: "1", sourceLine: "Oats", foodId: "f1", grams: 100, per100g: oats },
        { id: "2", sourceLine: "Oats", foodId: "f1", grams: 100, per100g: oats },
      ],
    });
    expect(result.totals.kcal).toBe(760);
    expect(result.ingredientGramsTotal).toBe(200);
    expect(result.recipeWeightG).toBe(200);
    expect(result.perServing.kcal).toBe(380);
    expect(result.per100g.kcal).toBe(380);
    expect(result.complete).toBe(true);
  });

  it("uses cooked weight for per 100 g without changing totals", () => {
    const result = computeNutritionRecipe({
      servings: 1,
      cookedWeightG: 400,
      items: [{ id: "1", sourceLine: "Oats", foodId: "f1", grams: 200, per100g: oats }],
    });
    expect(result.totals.kcal).toBe(760);
    expect(result.recipeWeightG).toBe(400);
    expect(result.per100g.kcal).toBe(190);
  });

  it("is incomplete until every remaining line is mapped", () => {
    const input = {
      servings: 1,
      cookedWeightG: null,
      items: [
        { id: "1", sourceLine: "Oats", foodId: "f1", grams: 50, per100g: oats },
        { id: "2", sourceLine: "Milk", foodId: null, grams: null, per100g: null },
      ],
    };
    expect(isNutritionRecipeComplete(input)).toBe(false);
    expect(
      isNutritionRecipeComplete({
        ...input,
        items: [input.items[0]!],
      }),
    ).toBe(true);
  });
});
