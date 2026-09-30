import { describe, expect, it } from "vitest";
import { foodFromLabelDraft } from "./foodLabel";

describe("foodFromLabelDraft", () => {
  it("copies per-100 g numbers and drops missing nutrients", () => {
    expect(
      foodFromLabelDraft({
        name: "  Vitamin D  ",
        basis: "per_100g",
        nutrients: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, vitaminDMcg: 25, ironMg: null },
      }),
    ).toEqual({
      name: "Vitamin D",
      per100g: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, vitaminDMcg: 25 },
      basisNote: null,
    });
  });

  it("scales a serving that states a gram weight", () => {
    expect(
      foodFromLabelDraft({
        name: "Capsule",
        basis: "per_serving",
        servingWeightG: 50,
        nutrients: { kcal: 10, vitaminCMg: 40 },
      }).per100g,
    ).toEqual({ kcal: 20, vitaminCMg: 80 });
  });

  it("keeps printed numbers and notes a serving with no weight", () => {
    const fill = foodFromLabelDraft({
      basis: "per_serving",
      servingWeightG: null,
      nutrients: { vitaminB12Mcg: 2.4 },
    });
    expect(fill.per100g).toEqual({ vitaminB12Mcg: 2.4 });
    expect(fill.basisNote).toBe("These numbers are per serving, not per 100 g.");
    expect(fill.name).toBeNull();
  });
});
