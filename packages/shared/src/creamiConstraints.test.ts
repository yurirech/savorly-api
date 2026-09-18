import { describe, expect, it } from "vitest";
import {
  CREAMI_FILL_TOLERANCE_G,
  creamiPintFillG,
  creamiSugarG,
  creamiXanthanRangeG,
} from "./creamiConstraints";

describe("creamiConstraints", () => {
  it("returns pint fill by size", () => {
    expect(creamiPintFillG("small")).toBe(450);
    expect(creamiPintFillG("big")).toBe(600);
    expect(CREAMI_FILL_TOLERANCE_G).toBe(15);
  });

  it("returns hard sugar by size", () => {
    expect(creamiSugarG("small")).toBe(15);
    expect(creamiSugarG("big")).toBe(20);
  });

  it("scales xanthan range with pint size", () => {
    expect(creamiXanthanRangeG("small")).toEqual({ min: 0.5, max: 2 });
    expect(creamiXanthanRangeG("big")).toEqual({ min: 0.5 * (600 / 450), max: 2 * (600 / 450) });
  });
});
