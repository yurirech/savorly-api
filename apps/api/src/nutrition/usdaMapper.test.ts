import { describe, expect, it } from "vitest";
import { mapFdcFoodToNutrients, mapFdcSearchHits } from "./usdaMapper";

const fixture = {
  fdcId: 171287,
  description: "Peanut butter",
  dataType: "SR Legacy",
  foodNutrients: [
    { nutrientNumber: "208", amount: 588 },
    { nutrientNumber: "203", amount: 25.1 },
    { nutrientNumber: "205", amount: 20 },
    { nutrientNumber: "204", amount: 50.4 },
    { nutrient: { number: "291" }, amount: 6 },
    { nutrient: { number: "307" }, amount: 429 },
    { nutrient: { number: "606" }, amount: 10.3 },
    { nutrient: { number: "303" }, amount: 1.9 },
    { nutrient: { number: "301" }, amount: 49 },
    { nutrient: { number: "328" }, amount: 0 },
  ],
};

describe("mapFdcFoodToNutrients", () => {
  it("maps FDC nutrient numbers onto the Savorly vector", () => {
    expect(mapFdcFoodToNutrients(fixture)).toEqual({
      kcal: 588,
      proteinG: 25.1,
      carbsG: 20,
      fatG: 50.4,
      fiberG: 6,
      sodiumMg: 429,
      saturatedFatG: 10.3,
      ironMg: 1.9,
      calciumMg: 49,
      vitaminDMcg: 0,
    });
  });

  it("rejects foods without macros", () => {
    expect(() => mapFdcFoodToNutrients({ foodNutrients: [{ nutrientNumber: "208", amount: 10 }] })).toThrow(
      "USDA food is missing calorie or macro data.",
    );
  });
});

describe("mapFdcSearchHits", () => {
  it("prefers Foundation and SR Legacy rows", () => {
    const hits = mapFdcSearchHits([
      { fdcId: 1, description: "Branded jar", dataType: "Branded" },
      { fdcId: 2, description: "Peanut butter", dataType: "SR Legacy" },
    ]);
    expect(hits).toEqual([{ fdcId: 2, name: "Peanut butter", dataType: "SR Legacy" }]);
  });
});
