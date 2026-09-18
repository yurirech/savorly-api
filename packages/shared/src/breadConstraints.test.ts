import { describe, expect, it } from "vitest";
import { BREAD_LOAF_WEIGHT_G, BREAD_SLICE_G, breadDefaultServings, breadLoafWeightG } from "./breadConstraints";

describe("breadConstraints", () => {
  it("maps loaf size to finished weight", () => {
    expect(BREAD_LOAF_WEIGHT_G.medium).toBe(750);
    expect(BREAD_LOAF_WEIGHT_G.large).toBe(1000);
    expect(breadLoafWeightG("medium")).toBe(750);
    expect(breadLoafWeightG("large")).toBe(1000);
  });

  it("defaults servings from loaf size and a ~40 g slice", () => {
    expect(BREAD_SLICE_G).toBe(40);
    expect(breadDefaultServings("medium")).toBe(12);
    expect(breadDefaultServings("large")).toBe(16);
  });
});
