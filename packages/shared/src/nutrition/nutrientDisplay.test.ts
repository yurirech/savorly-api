import { describe, expect, it } from "vitest";
import { formatNutrientAmount, listPresentNutrients } from "./nutrientDisplay";
import { hasExtendedNutrients, scaleNutrition, sumNutrients } from "./nutrients";

const peanutButter = {
  kcal: 588,
  proteinG: 25,
  carbsG: 20,
  fatG: 50,
  fiberG: 6,
  sodiumMg: 17,
};

describe("scaleNutrition", () => {
  it("scales optional micronutrients", () => {
    expect(scaleNutrition(peanutButter, 12)).toMatchObject({
      fiberG: 0.7,
      sodiumMg: 2,
    });
  });
});

describe("sumNutrients", () => {
  it("adds optional micronutrients across lines", () => {
    const total = sumNutrients([
      { kcal: 100, proteinG: 5, carbsG: 10, fatG: 3, fiberG: 2, sodiumMg: 100 },
      { kcal: 50, proteinG: 2, carbsG: 4, fatG: 1, fiberG: 1, sodiumMg: 50 },
    ]);
    expect(total.fiberG).toBe(3);
    expect(total.sodiumMg).toBe(150);
  });
});

describe("hasExtendedNutrients", () => {
  it("is false for macro-only rows", () => {
    expect(hasExtendedNutrients({ kcal: 1, proteinG: 1, carbsG: 1, fatG: 1 })).toBe(false);
  });

  it("is true when optional fields exist", () => {
    expect(hasExtendedNutrients({ kcal: 1, proteinG: 1, carbsG: 1, fatG: 1, fiberG: 0.1 })).toBe(true);
  });
});

describe("nutrientDisplay", () => {
  it("formats amounts with units", () => {
    expect(formatNutrientAmount(3.4, "g")).toBe("3.4 g");
    expect(formatNutrientAmount(45, "mcg")).toBe("45 µg");
  });

  it("lists grouped present nutrients only", () => {
    const groups = listPresentNutrients({
      kcal: 45,
      proteinG: 3.4,
      carbsG: 4.7,
      fatG: 1.4,
      saturatedFatG: 0.9,
      sodiumMg: 44,
      vitaminDMcg: 0.1,
    });
    expect(groups.map((group) => group.id)).toEqual(["fats_carbs", "minerals", "vitamins"]);
    expect(groups[0]?.rows.some((row) => row.key === "saturatedFatG")).toBe(true);
  });
});
