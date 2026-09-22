import { describe, expect, it } from "vitest";
import { remainingMacros, scaleNutrition, sumNutrients } from "./nutrients";

const peanutButter = {
  kcal: 588,
  proteinG: 25,
  carbsG: 20,
  fatG: 50,
  fiberG: 6,
};

describe("scaleNutrition", () => {
  it("scales 12 g as 12% of the per-100 g row", () => {
    expect(scaleNutrition(peanutButter, 12)).toEqual({
      kcal: 71,
      proteinG: 3,
      carbsG: 2.4,
      fatG: 6,
      fiberG: 0.7,
    });
  });

  it("returns the stored row at 100 g", () => {
    expect(scaleNutrition(peanutButter, 100)).toMatchObject({
      kcal: 588,
      proteinG: 25,
      carbsG: 20,
      fatG: 50,
      fiberG: 6,
    });
  });
});

describe("sumNutrients", () => {
  it("adds diary lines", () => {
    const total = sumNutrients([scaleNutrition(peanutButter, 12), scaleNutrition(peanutButter, 100)]);
    expect(total.kcal).toBe(659);
    expect(total.proteinG).toBe(28);
  });
});

describe("remainingMacros", () => {
  it("subtracts consumed from targets", () => {
    expect(remainingMacros({ kcal: 2000, proteinG: 150, carbsG: 200, fatG: 67 }, { kcal: 71, proteinG: 3, carbsG: 2.4, fatG: 6 })).toEqual({
      kcal: 1929,
      proteinG: 147,
      carbsG: 197.6,
      fatG: 61,
    });
  });
});
