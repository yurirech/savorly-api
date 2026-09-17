import { describe, expect, it } from "vitest";
import { formatIngredientLine, formatQuantity } from "./formatQuantity";
import { parseIngredientLine, parseIngredientLines } from "./parseIngredientLine";

describe("parseIngredientLine", () => {
  it("parses mixed numbers, grams, PT-BR spoons, and Italian cups", () => {
    expect(parseIngredientLine("1 1/2 cup AP flour")).toMatchObject({
      quantity: 1.5,
      unit: "cup",
      name: "AP flour",
    });
    expect(parseIngredientLine("200 g spaghetti")).toMatchObject({
      quantity: 200,
      unit: "g",
      name: "spaghetti",
    });
    expect(parseIngredientLine("2 colheres de sopa azeite")).toMatchObject({
      quantity: 2,
      unit: "tbsp",
      name: "azeite",
    });
    expect(parseIngredientLine("1 tazza farina 00")).toMatchObject({
      quantity: 1,
      unit: "cup",
      name: "farina 00",
    });
  });

  it("keeps salt to taste without a quantity", () => {
    expect(parseIngredientLine("salt to taste")).toMatchObject({
      quantity: null,
      unit: null,
      name: "salt to taste",
    });
    expect(parseIngredientLine("salt, to taste")).toMatchObject({
      quantity: null,
      unit: null,
      name: "salt",
      notes: "to taste",
    });
  });

  it("does not treat 00 flour as a quantity", () => {
    expect(parseIngredientLine("00 flour")).toMatchObject({
      quantity: null,
      name: "00 flour",
    });
  });

  it("reattaches pantry keys after a review edit", () => {
    const parsed = parseIngredientLines("2 colheres de sopa azeite\n1 tazza farina 00");
    expect(parsed[0]?.canonicalKey).toBe("olive_oil");
    expect(parsed[1]?.canonicalKey).toBe("tipo_00_flour");
  });
});

describe("formatQuantity", () => {
  it("rounds grams and kitchen fractions", () => {
    expect(formatQuantity(125.4, "g")).toBe("125");
    expect(formatQuantity(1.5, "cup")).toBe("1 1/2");
    expect(formatQuantity(0.33, "cup")).toBe("1/3");
    expect(formatQuantity(0.125, "cup")).not.toBe("1/8");
    expect(formatQuantity(1.5, "tbsp")).toBe("1 1/2");
    expect(formatIngredientLine({ quantity: 200, unit: "g", name: "spaghetti", notes: null })).toBe("200 g spaghetti");
  });
});
