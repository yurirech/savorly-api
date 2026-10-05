import { describe, expect, it } from "vitest";
import { foodEmoji, foodVisual } from "./foodEmoji";

describe("foodVisual", () => {
  it.each([
    ["Milk semi-skimmed", "dairy", "🥛"],
    ["Karnemelk", "dairy", "🥛"],
    ["Gouda 48+", "cheese", "🧀"],
    ["Roomboter", "butter", "🧈"],
    ["Havermout", "grain", "🌾"],
    ["Volkorenbrood", "bread", "🍞"],
    ["Aardappelen gekookt", "potato", "🥔"],
    ["Appelsap", "juice", "🧃"],
    ["Apple", "fruit", "🍎"],
    ["Zalmfilet", "fish", "🐟"],
    ["Rundergehakt", "meat", "🥩"],
    ["Eggs boiled", "egg", "🥚"],
    ["Pindakaas", "nut", "🥜"],
    ["Mushrooms", "mushroom", "🍄"],
    ["Olijfolie", "oil", "🫒"],
  ])("maps %s to %s", (name, kind, emoji) => {
    expect(foodVisual({ name })).toEqual({ kind, emoji });
  });

  it("uses the original Dutch name when the label is English-unknown", () => {
    expect(foodVisual({ name: "Semi-skimmed drink", originalName: "Melk halfvolle" }).kind).toBe("dairy");
  });

  it("does not read eggplant as an egg", () => {
    expect(foodVisual({ name: "Eggplant" }).kind).toBe("vegetable");
  });

  it("marks published recipe foods", () => {
    expect(foodVisual({ name: "Banana bread", source: "recipe" })).toEqual({ kind: "recipe", emoji: "🍽️" });
  });

  it("falls back to a spoon", () => {
    expect(foodEmoji({ name: "Mystery mix" })).toBe("🥄");
  });
});
