import { describe, expect, it } from "vitest";
import { getMockUsdaFood, searchMockUsdaFoods } from "./mockUsda";

describe("searchMockUsdaFoods", () => {
  it("finds generic staples by name", () => {
    expect(searchMockUsdaFoods("milk").some((hit) => hit.name.toLowerCase().includes("milk"))).toBe(true);
    expect(getMockUsdaFood(1100001)?.per100g.kcal).toBe(588);
  });
});
