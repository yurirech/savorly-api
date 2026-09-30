import { describe, expect, it } from "vitest";
import { foodFillFromGemini, recipeDraftFromGemini } from "./pasteFill";

describe("paste fill", () => {
  it("reads a per-serving label that includes a gram weight", () => {
    expect(
      foodFillFromGemini({
        name: "Magnesium",
        basis: "per_serving",
        servingWeightG: 25,
        kcal: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
        magnesiumMg: 100,
        vitaminDMcg: null,
      }),
    ).toEqual({
      name: "Magnesium",
      per100g: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, magnesiumMg: 400 },
      basisNote: null,
    });
  });

  it("keeps ingredient lines and drops a blank name", () => {
    expect(
      recipeDraftFromGemini({
        title: "Oats",
        servings: 2,
        ingredients: [
          { name: "For the bowl:", lineKind: "section" },
          { name: "Oats", quantity: 40, unit: "g" },
          { name: "   " },
        ],
      }),
    ).toEqual({
      title: "Oats",
      servings: 2,
      ingredients: [
        { name: "For the bowl:", quantity: null, unit: null, lineKind: "section" },
        { name: "Oats", quantity: 40, unit: "g", lineKind: "ingredient" },
      ],
    });
  });
});
