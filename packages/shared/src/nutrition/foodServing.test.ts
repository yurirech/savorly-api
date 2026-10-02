import { describe, expect, it } from "vitest";
import {
  convertFoodAmount,
  gramsFromServingAmount,
  recipeServingWeightG,
  resolveFoodGrams,
  servingsFromGrams,
} from "./foodServing";

describe("food servings", () => {
  it("derives grams per serving from a recipe", () => {
    expect(recipeServingWeightG(400, 2)).toBe(200);
    expect(recipeServingWeightG(0, 2)).toBeNull();
  });

  it("converts servings to grams at log time", () => {
    expect(gramsFromServingAmount(1.5, 80)).toBe(120);
    expect(resolveFoodGrams("servings", 2, 50)).toBe(100);
    expect(resolveFoodGrams("grams", 40, 50)).toBe(40);
    expect(resolveFoodGrams("servings", 1, null)).toBeNull();
  });

  it("converts a typed amount between units", () => {
    expect(servingsFromGrams(150, 50)).toBe(3);
    expect(convertFoodAmount(100, "grams", "servings", 50)).toBe(2);
    expect(convertFoodAmount(2, "servings", "grams", 50)).toBe(100);
  });
});
