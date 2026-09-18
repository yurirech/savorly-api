import { describe, expect, it } from "vitest";
import { displayIngredient } from "./convert";
import { formatCopyIngredientLine, formatRecipeIngredientsCopy } from "./formatIngredientCopy";

describe("formatCopyIngredientLine", () => {
  it("puts the name first and packs quantity against the unit", () => {
    expect(formatCopyIngredientLine({ name: "AP flour", quantity: 100, unit: "g" })).toBe("AP flour 100g");
    expect(formatCopyIngredientLine({ name: "Butter", quantity: 100, unit: "g" })).toBe("Butter 100g");
    expect(formatCopyIngredientLine({ name: "olive oil", quantity: 2, unit: "tbsp" })).toBe("olive oil 2tbsp");
    expect(formatCopyIngredientLine({ name: "milk", quantity: 0.5, unit: "cup" })).toBe("milk 1/2cup");
  });

  it("uses only the name when quantity is missing", () => {
    expect(formatCopyIngredientLine({ name: "salt", quantity: null, unit: null })).toBe("salt");
  });

  it("skips notes", () => {
    expect(
      formatCopyIngredientLine({
        name: "garlic cloves",
        quantity: 3,
        unit: null,
        notes: "thinly sliced",
      }),
    ).toBe("garlic cloves 3");
  });
});

describe("formatRecipeIngredientsCopy", () => {
  it("starts with the title then compact ingredient lines", () => {
    expect(
      formatRecipeIngredientsCopy("Honey oat loaf", [
        { name: "AP flour", quantity: 570, unit: "g" },
        { name: "Water", quantity: 342, unit: "g" },
        { name: "Instant yeast", quantity: 10, unit: "g" },
      ]),
    ).toBe("Honey oat loaf\nAP flour 570g\nWater 342g\nInstant yeast 10g");
  });

  it("copies scaled grams when the displayed quantity is already scaled", () => {
    const shown = displayIngredient(
      { name: "AP flour", quantity: 200, unit: "g", notes: "sifted" },
      { originalServings: 2, displayServings: 4, displayUnit: "original" },
    );
    expect(formatRecipeIngredientsCopy("Pasta", [shown])).toBe("Pasta\nAP flour 400g");
  });
});
