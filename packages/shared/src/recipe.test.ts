import { describe, expect, it } from "vitest";
import {
  ingredientSectionTitle,
  isCreamiRecipe,
  isIngredientSection,
  isMixInIngredient,
  isPantryIngredient,
  promoteIngredientSections,
  recipeNotesText,
} from "./recipe";

describe("recipeNotesText", () => {
  it("joins notes and leftover import remarks", () => {
    expect(
      recipeNotesText({
        notes: "Use room-temp eggs",
        uncertainties: ["Oven time was not specified."],
      }),
    ).toBe("Use room-temp eggs\nOven time was not specified.");
  });

  it("returns an empty string when both are blank", () => {
    expect(recipeNotesText({ notes: "  ", uncertainties: [] })).toBe("");
  });
});

describe("Creami helpers", () => {
  it("detects Creami recipes and mix-in notes", () => {
    expect(
      isCreamiRecipe({
        source: { type: "manual", sourceName: "Creami" },
        tags: [],
      }),
    ).toBe(true);
    expect(isMixInIngredient({ notes: "mix-in" })).toBe(true);
    expect(isMixInIngredient({ notes: "toasted" })).toBe(false);
  });
});

describe("ingredient sections", () => {
  it("treats explicit lineKind and inferred For-the rows as sections", () => {
    expect(isIngredientSection({ name: "For the filling", lineKind: "section" })).toBe(true);
    expect(isIngredientSection({ name: "For the base" })).toBe(true);
    expect(isIngredientSection({ name: "Crust:" })).toBe(true);
    expect(isIngredientSection({ name: "salt" })).toBe(false);
    expect(isIngredientSection({ name: "For the topping", quantity: 1, unit: "cup" })).toBe(false);
    expect(ingredientSectionTitle({ name: "For the base:" })).toBe("For the base");
    expect(isPantryIngredient({ name: "For the base" })).toBe(false);
    expect(isPantryIngredient({ name: "cookie dough", notes: "mix-in" })).toBe(false);
    expect(isPantryIngredient({ name: "butter", quantity: 80, unit: "g" })).toBe(true);
  });

  it("promotes inferred headings to section lineKind", () => {
    const [section, flour] = promoteIngredientSections([
      { name: "For the base" },
      { name: "flour", quantity: 100, unit: "g" },
    ]);
    expect(section?.lineKind).toBe("section");
    expect(flour?.lineKind).toBeUndefined();
  });
});
