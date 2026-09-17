import { describe, expect, it } from "vitest";
import { canConvertIngredient, convertQuantity, displayIngredient, pickVolumeUnit } from "./convert";
import { formatIngredientLine, formatQuantity } from "./formatQuantity";
import { scaleFactor, scaleQuantity } from "./scale";
import type { Ingredient } from "../recipe";

const flour: Ingredient = {
  name: "plain flour",
  quantity: 1,
  unit: "cup",
  notes: null,
  canonicalKey: "all_purpose_flour",
  gramsPerCup: 125,
};

const butter: Ingredient = {
  name: "butter",
  quantity: 2,
  unit: "tbsp",
  notes: null,
  canonicalKey: "unsalted_butter",
  gramsPerCup: 227,
};

const vanilla: Ingredient = {
  name: "salt",
  quantity: 1,
  unit: "tsp",
  notes: null,
  canonicalKey: "salt",
  gramsPerCup: 273,
};

describe("scale", () => {
  it("scales from the original servings only", () => {
    expect(scaleFactor(4, 8)).toBe(2);
    expect(scaleFactor(4, 2)).toBe(0.5);
    expect(scaleQuantity(200, scaleFactor(4, 8))).toBe(400);
    expect(scaleQuantity(200, scaleFactor(4, 2))).toBe(100);
  });

  it("does not scale missing servings or null quantities", () => {
    expect(scaleFactor(null, 8)).toBe(1);
    expect(scaleFactor(0, 8)).toBe(1);
    expect(scaleQuantity(null, 2)).toBeNull();
  });
});

describe("convert", () => {
  it("derives tbsp and tsp from grams per cup", () => {
    expect(convertQuantity({ quantity: 1, from: "cup", to: "g", gramsPerCup: 125 })).toBe(125);
    expect(convertQuantity({ quantity: 16, from: "tbsp", to: "cup", gramsPerCup: 125 })).toBe(1);
    expect(convertQuantity({ quantity: 48, from: "tsp", to: "cup", gramsPerCup: 125 })).toBe(1);
    expect(convertQuantity({ quantity: 125, from: "g", to: "cup", gramsPerCup: 125 })).toBe(1);
  });

  it("skips conversion when quantity or unit cannot convert", () => {
    expect(canConvertIngredient({ name: "salt", quantity: null, unit: null, notes: "to taste" })).toBe(false);
    expect(canConvertIngredient({ name: "garlic cloves", quantity: 3, unit: null })).toBe(false);
    expect(canConvertIngredient({ name: "mystery", quantity: 1, unit: "cup" })).toBe(false);
  });

  it("scales originals then converts grams", () => {
    const doubled = displayIngredient(flour, { originalServings: 4, displayServings: 8, displayUnit: "g" });
    expect(doubled.quantity).toBe(250);
    expect(doubled.unit).toBe("g");
  });

  it("picks cup, tbsp, or tsp from the scaled volume", () => {
    expect(pickVolumeUnit(1)).toBe("cup");
    expect(pickVolumeUnit(0.25)).toBe("cup");
    expect(pickVolumeUnit(0.5)).toBe("cup");
    expect(pickVolumeUnit(3 / 16)).toBe("tbsp");
    expect(pickVolumeUnit(2 / 16)).toBe("tbsp");
    expect(pickVolumeUnit(1 / 48)).toBe("tsp");

    const cupLine = displayIngredient(flour, { originalServings: 2, displayServings: 2, displayUnit: "volume" });
    expect(cupLine.unit).toBe("cup");
    expect(cupLine.quantity).toBe(1);

    const halfCup = displayIngredient(flour, { originalServings: 4, displayServings: 2, displayUnit: "volume" });
    expect(halfCup.unit).toBe("cup");
    expect(halfCup.quantity).toBe(0.5);

    const tbspLine = displayIngredient(butter, { originalServings: 4, displayServings: 4, displayUnit: "volume" });
    expect(tbspLine.unit).toBe("tbsp");
    expect(tbspLine.quantity).toBe(2);

    const threeTbsp: Ingredient = { ...butter, quantity: 3 };
    const underQuarter = displayIngredient(threeTbsp, {
      originalServings: 4,
      displayServings: 4,
      displayUnit: "volume",
    });
    expect(underQuarter.unit).toBe("tbsp");
    expect(underQuarter.quantity).toBe(3);

    const tspLine = displayIngredient(vanilla, { originalServings: 4, displayServings: 4, displayUnit: "volume" });
    expect(tspLine.unit).toBe("tsp");
    expect(tspLine.quantity).toBe(1);
  });

  it("does not format 2 tbsp as 1/8 cup", () => {
    const shown = displayIngredient(butter, { originalServings: 1, displayServings: 1, displayUnit: "volume" });
    expect(formatIngredientLine(shown)).toBe("2 tbsp butter");
    expect(formatQuantity(2 / 16, "cup")).not.toBe("1/8");
  });

  it("leaves unconvertible lines in the scaled original unit", () => {
    const cloves: Ingredient = { name: "garlic cloves", quantity: 3, unit: null, notes: "thinly sliced" };
    const shown = displayIngredient(cloves, { originalServings: 2, displayServings: 4, displayUnit: "g" });
    expect(shown.quantity).toBe(6);
    expect(shown.unit).toBeNull();
    expect(shown.notes).toBe("thinly sliced");
  });
});
