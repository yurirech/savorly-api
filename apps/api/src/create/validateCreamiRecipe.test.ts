import { describe, expect, it } from "vitest";
import type { CreamiGenerateRequest, GeneratedRecipe, Ingredient } from "@savorly/shared";
import { normalizeCreamiRecipe } from "./validateCreamiRecipe";

const request: CreamiGenerateRequest = {
  agent: "creami",
  size: "small",
  macros: "lean",
  texture: "gelato",
  sweetenerKind: "lightweight",
};

function recipe(ingredients: Ingredient[]): GeneratedRecipe {
  return {
    title: "Test pint",
    category: "dessert",
    ingredients,
    steps: [],
    tags: ["creami"],
    uncertainties: [],
    source: { type: "manual", sourceName: "Creami" },
  };
}

describe("normalizeCreamiRecipe", () => {
  it("forces wrong sugar to 15 g on a normal pint", () => {
    const normalized = normalizeCreamiRecipe(
      recipe([
        { name: "skim milk", quantity: 300, unit: "g", notes: null },
        { name: "0% quark", quantity: 90, unit: "g", notes: null },
        { name: "whey", quantity: 25, unit: "g", notes: null },
        { name: "SMP", quantity: 10, unit: "g", notes: null },
        { name: "sugar", quantity: 13, unit: "g", notes: null },
        { name: "xanthan gum", quantity: 1.5, unit: "g", notes: null },
        { name: "salt", quantity: 1, unit: "g", notes: null },
      ]),
      request,
    );
    const sugar = normalized.ingredients.find((item) => item.name === "sugar");
    expect(sugar?.quantity).toBe(15);
    expect(sugar?.unit).toBe("g");
  });

  it("adds missing sugar at the hard size value", () => {
    const normalized = normalizeCreamiRecipe(
      recipe([
        { name: "skim milk", quantity: 300, unit: "g", notes: null },
        { name: "0% quark", quantity: 90, unit: "g", notes: null },
        { name: "whey", quantity: 25, unit: "g", notes: null },
        { name: "SMP", quantity: 10, unit: "g", notes: null },
        { name: "xanthan gum", quantity: 1.5, unit: "g", notes: null },
        { name: "salt", quantity: 1, unit: "g", notes: null },
      ]),
      request,
    );
    const sugar = normalized.ingredients.find((item) => item.name === "refined sugar");
    expect(sugar?.quantity).toBe(15);
  });

  it("reduces skim when fill is 20 g over target", () => {
    const normalized = normalizeCreamiRecipe(
      recipe([
        { name: "skim milk", quantity: 320, unit: "g", notes: null },
        { name: "0% quark", quantity: 98, unit: "g", notes: null },
        { name: "whey", quantity: 25, unit: "g", notes: null },
        { name: "SMP", quantity: 10, unit: "g", notes: null },
        { name: "sugar", quantity: 15, unit: "g", notes: null },
        { name: "xanthan gum", quantity: 1, unit: "g", notes: null },
        { name: "salt", quantity: 1, unit: "g", notes: null },
      ]),
      request,
    );
    const skim = normalized.ingredients.find((item) => item.name === "skim milk");
    expect(skim?.quantity).toBe(300);
  });

  it("excludes mix-ins from the fill sum", () => {
    const normalized = normalizeCreamiRecipe(
      recipe([
        { name: "skim milk", quantity: 300, unit: "g", notes: null },
        { name: "0% quark", quantity: 90, unit: "g", notes: null },
        { name: "whey", quantity: 25, unit: "g", notes: null },
        { name: "SMP", quantity: 10, unit: "g", notes: null },
        { name: "sugar", quantity: 15, unit: "g", notes: null },
        { name: "xanthan gum", quantity: 1.5, unit: "g", notes: null },
        { name: "salt", quantity: 1, unit: "g", notes: null },
        { name: "cookie dough", quantity: 40, unit: "g", notes: "mix-in" },
      ]),
      request,
    );
    const skim = normalized.ingredients.find((item) => item.name === "skim milk");
    expect(skim?.quantity).toBe(300);
    expect(normalized.ingredients.find((item) => item.name === "cookie dough")?.quantity).toBe(40);
  });

  it("forces big-pint sugar to 20 g", () => {
    const normalized = normalizeCreamiRecipe(
      recipe([
        { name: "skim milk", quantity: 400, unit: "g", notes: null },
        { name: "0% quark", quantity: 120, unit: "g", notes: null },
        { name: "whey", quantity: 35, unit: "g", notes: null },
        { name: "SMP", quantity: 15, unit: "g", notes: null },
        { name: "granulated sugar", quantity: 12, unit: "g", notes: null },
        { name: "xanthan gum", quantity: 2, unit: "g", notes: null },
        { name: "salt", quantity: 1, unit: "g", notes: null },
      ]),
      { ...request, size: "big" },
    );
    expect(normalized.ingredients.find((item) => item.name === "granulated sugar")?.quantity).toBe(20);
  });
});
