import { describe, expect, it } from "vitest";
import { formatDiaryEntryCaption, parseAmountUnit } from "./formatDiaryEntryCaption";

describe("formatDiaryEntryCaption", () => {
  it("shows grams and kcal for a food logged in grams", () => {
    expect(
      formatDiaryEntryCaption({
        kind: "food",
        grams: 48,
        kcal: 150,
        amountUnit: "grams",
        servingWeightG: 32,
      }),
    ).toBe("48 g · 150 kcal");
  });

  it("shows servings and grams when logged as a serving", () => {
    expect(
      formatDiaryEntryCaption({
        kind: "food",
        grams: 48,
        kcal: 150,
        amountUnit: "servings",
        servingWeightG: 32,
      }),
    ).toBe("1.5 serv · 48 g · 150 kcal");
  });

  it("falls back to grams when serving weight is missing", () => {
    expect(
      formatDiaryEntryCaption({
        kind: "food",
        grams: 48,
        kcal: 150,
        amountUnit: "servings",
        servingWeightG: null,
      }),
    ).toBe("48 g · 150 kcal");
  });
});

describe("parseAmountUnit", () => {
  it("treats unknown values as grams", () => {
    expect(parseAmountUnit("servings")).toBe("servings");
    expect(parseAmountUnit("grams")).toBe("grams");
    expect(parseAmountUnit(undefined)).toBe("grams");
  });
});
