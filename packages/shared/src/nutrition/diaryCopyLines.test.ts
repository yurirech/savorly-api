import { describe, expect, it } from "vitest";
import { diaryLinesFromCookbook } from "./diaryCopyLines";

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
});
