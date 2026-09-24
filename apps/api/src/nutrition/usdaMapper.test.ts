import { describe, expect, it } from "vitest";
import { FDC_NUMBERS, mapFdcFoodToNutrients, mapFdcSearchHits } from "./usdaMapper";

describe("mapFdcFoodToNutrients", () => {
  it("maps optional micronutrients when present on the food", () => {
    const nutrients = mapFdcFoodToNutrients({
      description: "Test food",
      foodNutrients: [
        { nutrientNumber: FDC_NUMBERS.kcal, amount: 100 },
        { nutrientNumber: FDC_NUMBERS.proteinG, amount: 10 },
        { nutrientNumber: FDC_NUMBERS.carbsG, amount: 12 },
        { nutrientNumber: FDC_NUMBERS.fatG, amount: 5 },
        { nutrientNumber: FDC_NUMBERS.fiberG, amount: 3 },
        { nutrientNumber: FDC_NUMBERS.potassiumMg, amount: 200 },
        { nutrientNumber: FDC_NUMBERS.vitaminCMg, amount: 8 },
      ],
    });
    expect(nutrients).toMatchObject({
      kcal: 100,
      fiberG: 3,
      potassiumMg: 200,
      vitaminCMg: 8,
    });
  });
});

describe("mapFdcSearchHits", () => {
  it("prefers foundation and sr legacy hits", () => {
    const hits = mapFdcSearchHits([
      { fdcId: 1, description: "Branded", dataType: "Branded" },
      { fdcId: 2, description: "Foundation", dataType: "Foundation" },
    ]);
    expect(hits[0]?.fdcId).toBe(2);
  });
});
