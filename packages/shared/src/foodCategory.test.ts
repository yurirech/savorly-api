import { describe, expect, it } from "vitest";
import { isFoodCategory, parseFoodCategory } from "./foodCategory";

describe("foodCategory", () => {
  it("accepts the controlled list", () => {
    expect(isFoodCategory("cake")).toBe(true);
    expect(isFoodCategory("brunch")).toBe(false);
  });

  it("falls back to other", () => {
    expect(parseFoodCategory("nope")).toBe("other");
    expect(parseFoodCategory("soup")).toBe("soup");
  });
});
