import { describe, expect, it } from "vitest";
import { foodMatchesQuery } from "./foodSearch";

describe("foodMatchesQuery", () => {
  const food = { name: "Skim milk", originalName: "Halfvolle melk" };

  it("matches name or original name", () => {
    expect(foodMatchesQuery(food, "skim")).toBe(true);
    expect(foodMatchesQuery(food, "MELK")).toBe(true);
    expect(foodMatchesQuery(food, "yogurt")).toBe(false);
  });

  it("treats a blank query as a match", () => {
    expect(foodMatchesQuery(food, "  ")).toBe(true);
  });
});
