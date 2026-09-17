import { describe, expect, it } from "vitest";
import { parseGeminiRecipe, parseRecipeNutrition, repairGeminiJson } from "./geminiRecipeSchema";

const source = { type: "manual" as const, sourceName: "Creami" };

const nutrition = {
  servingG: 150,
  perServing: { kcal: 160, proteinG: 21, carbsG: 14, fatG: 2 },
  perPint: { kcal: 480, proteinG: 63, carbsG: 42, fatG: 6 },
};

describe("parseGeminiRecipe nutrition", () => {
  it("keeps structured macros on a generated recipe", () => {
    const recipe = parseGeminiRecipe(
      {
        title: "Strawberry Creami",
        category: "dessert",
        ingredients: [{ name: "quark", quantity: 100, unit: "g" }],
        steps: [{ order: 1, text: "Blend and freeze." }],
        tags: ["creami"],
        uncertainties: [],
        nutrition,
      },
      source,
    );
    expect(recipe.nutrition).toEqual(nutrition);
  });

  it("drops incomplete nutrition instead of guessing", () => {
    const recipe = parseGeminiRecipe(
      {
        title: "Imported cake",
        category: "cake",
        ingredients: [{ name: "flour" }],
        steps: [{ text: "Bake." }],
        tags: [],
        uncertainties: [],
        nutrition: { servingG: 150 },
      },
      source,
    );
    expect(recipe.nutrition).toBeNull();
    expect(parseRecipeNutrition(null)).toBeNull();
  });

  it("maps a flat Gemini nutrition object onto per serving / per pint", () => {
    expect(
      parseRecipeNutrition({
        servingG: 150,
        servingKcal: 160,
        servingProteinG: 21,
        servingCarbsG: 14,
        servingFatG: 2,
        pintKcal: 480,
        pintProteinG: 63,
        pintCarbsG: 42,
        pintFatG: 6,
      }),
    ).toEqual(nutrition);
  });
});

describe("repairGeminiJson", () => {
  it("strips trailing commas and quotes bare mix-in notes", () => {
    const repaired = repairGeminiJson(`{
      "title": "Pint",
      "ingredients": [
        {"name": "quark", "quantity": 100, "unit": "g", "notes": mix-in},
      ],
    }`);
    expect(JSON.parse(repaired)).toMatchObject({
      title: "Pint",
      ingredients: [{ name: "quark", notes: "mix-in" }],
    });
  });
});
