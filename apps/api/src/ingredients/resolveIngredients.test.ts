import { describe, expect, it } from "vitest";
import { applyPantrySnapshot } from "@savorly/shared";
import { parseIdentifyItems, needsIdentify, slugKey } from "./identifyUnknownIngredients";
import { snapshotRecipeIngredients } from "./resolveIngredients";

describe("resolveIngredients local snapshot", () => {
  it("matches aliases and normalizes units without Gemini", () => {
    const recipe = snapshotRecipeIngredients({
      title: "Test",
      category: "pasta",
      servings: 2,
      ingredients: [
        { name: "farinha de trigo", quantity: 1, unit: "xícara", notes: null },
        { name: "azeite", quantity: 2, unit: "colheres de sopa", notes: null },
        { name: "salt", quantity: null, unit: null, notes: "to taste" },
      ],
      steps: [{ order: 1, text: "Mix.", durationMinutes: null, temperatureC: null }],
      tags: [],
      uncertainties: [],
      source: { type: "text" },
    });

    expect(recipe.ingredients[0]?.canonicalKey).toBe("all_purpose_flour");
    expect(recipe.ingredients[0]?.unit).toBe("cup");
    expect(recipe.ingredients[0]?.gramsPerCup).toBe(125);
    expect(recipe.ingredients[1]?.canonicalKey).toBe("olive_oil");
    expect(recipe.ingredients[1]?.unit).toBe("tbsp");
    expect(recipe.ingredients[2]?.quantity).toBeNull();
  });
});

describe("identify parse", () => {
  it("keeps known pantry densities and rejects nonsense grams", () => {
    const parsed = parseIdentifyItems({
      items: [
        { name: "farinha de trigo", key: "all_purpose_flour", gramsPerCup: 12 },
        { name: "tapioca starch", key: "tapioca_starch", gramsPerCup: 120, aliases: ["polvilho"] },
        { name: "lead", key: "lead", gramsPerCup: 9000 },
      ],
    });
    expect(parsed.find((item) => item.key === "all_purpose_flour")?.gramsPerCup).toBe(125);
    expect(parsed.find((item) => item.key === "tapioca_starch")?.gramsPerCup).toBe(120);
    expect(parsed.some((item) => item.key === "lead")).toBe(false);
  });

  it("flags convertible unknowns for a Gemini pass", () => {
    expect(needsIdentify(applyPantrySnapshot({ name: "jackfruit", quantity: 1, unit: "cup" }))).toBe(true);
    expect(needsIdentify(applyPantrySnapshot({ name: "flour", quantity: 1, unit: "cup" }))).toBe(false);
    expect(slugKey("Farinha 00!")).toBe("farinha_00");
  });
});
