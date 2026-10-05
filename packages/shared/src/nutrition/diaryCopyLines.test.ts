import { describe, expect, it } from "vitest";
import { diaryLinesFromCookbook, matchCopyFoodId } from "./diaryCopyLines";

const flour = { id: "flour", name: "Flour", source: "manual" };

describe("diaryLinesFromCookbook", () => {
  it("keeps a heading row that still has an amount", () => {
    const lines = diaryLinesFromCookbook(
      [{ name: "Flour", quantity: 200, unit: "g", lineKind: "section" }],
      [],
    );
    expect(lines).toEqual([{ sourceLine: "Flour", foodId: null, grams: 200 }]);
  });

  it("drops a heading and keeps the ingredients under it", () => {
    const lines = diaryLinesFromCookbook(
      [
        { name: "For the base", lineKind: "section" },
        { name: "Flour", quantity: 100, unit: "g" },
        { name: "For the filling:", quantity: null, unit: null },
      ],
      [],
    );
    expect(lines).toEqual([{ sourceLine: "Flour", foodId: null, grams: 100 }]);
  });

  it("sums grams of the same ingredient", () => {
    const lines = diaryLinesFromCookbook(
      [
        { name: "Flour", quantity: 100, unit: "g" },
        { name: "flour", quantity: 50, unit: "g" },
      ],
      [flour],
    );
    expect(lines).toEqual([{ sourceLine: "Flour", foodId: "flour", grams: 150 }]);
  });

  it("leaves grams empty when one duplicate has no amount", () => {
    const lines = diaryLinesFromCookbook(
      [
        { name: "Salt", quantity: 5, unit: "g" },
        { name: "Salt" },
      ],
      [],
    );
    expect(lines).toEqual([{ sourceLine: "Salt", foodId: null, grams: null }]);
  });

  it("keeps the cookbook text as the line label when a food matches", () => {
    const lines = diaryLinesFromCookbook(
      [{ name: "Semi-skimmed milk", quantity: 200, unit: "g" }],
      [{ id: "milk", name: "Milk semi-skimmed", originalName: "Melk halfvolle", source: "nevo" }],
    );
    expect(lines).toEqual([{ sourceLine: "Semi-skimmed milk", foodId: "milk", grams: 200 }]);
  });
});

describe("matchCopyFoodId", () => {
  const milk = { id: "milk", name: "Milk semi-skimmed", originalName: "Melk halfvolle", source: "nevo" };
  const wholeMilk = { id: "whole", name: "Milk whole", originalName: "Melk volle", source: "nevo" };
  const oats = { id: "oats", name: "Oats", originalName: "Havermout", source: "nevo" };
  const porridge = { id: "porridge", name: "Porridge", originalName: "Porridge", source: "recipe" };

  it("matches the exact name, case and accents ignored", () => {
    expect(matchCopyFoodId("oats", [oats, milk])).toBe("oats");
  });

  it("matches the original Dutch name", () => {
    expect(matchCopyFoodId("Havermout", [oats, milk])).toBe("oats");
  });

  it("matches the same words in another order", () => {
    expect(matchCopyFoodId("semi-skimmed milk", [milk, oats])).toBe("milk");
  });

  it("matches when exactly one food contains the words", () => {
    expect(matchCopyFoodId("rolled oats", [oats, milk])).toBe("oats");
    expect(matchCopyFoodId("milk", [milk, oats])).toBe("milk");
  });

  it("leaves ambiguous and empty names unmatched", () => {
    expect(matchCopyFoodId("milk", [milk, wholeMilk])).toBeNull();
    expect(matchCopyFoodId("   ", [milk])).toBeNull();
    expect(matchCopyFoodId("butter", [milk, oats])).toBeNull();
  });

  it("never matches a published recipe food", () => {
    expect(matchCopyFoodId("porridge", [porridge])).toBeNull();
  });
});
