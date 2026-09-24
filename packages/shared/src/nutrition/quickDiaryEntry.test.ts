import { describe, expect, it } from "vitest";
import {
  buildQuickDiaryNutrients,
  parseQuickDiaryLabel,
  QUICK_DIARY_DEFAULT_LABEL,
  validateQuickDiaryKcal,
} from "./quickDiaryEntry";

describe("parseQuickDiaryLabel", () => {
  it("defaults empty labels", () => {
    expect(parseQuickDiaryLabel("")).toBe(QUICK_DIARY_DEFAULT_LABEL);
    expect(parseQuickDiaryLabel(undefined)).toBe(QUICK_DIARY_DEFAULT_LABEL);
  });

  it("trims and keeps custom names", () => {
    expect(parseQuickDiaryLabel("  Office lunch  ")).toBe("Office lunch");
  });
});

describe("buildQuickDiaryNutrients", () => {
  it("defaults optional macros to zero", () => {
    expect(buildQuickDiaryNutrients({ kcal: 450 })).toEqual({
      kcal: 450,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  });
});

describe("validateQuickDiaryKcal", () => {
  it("accepts non-negative finite numbers", () => {
    expect(validateQuickDiaryKcal(0)).toBe(true);
    expect(validateQuickDiaryKcal(120)).toBe(true);
    expect(validateQuickDiaryKcal(Number.NaN)).toBe(false);
    expect(validateQuickDiaryKcal(-1)).toBe(false);
  });
});
