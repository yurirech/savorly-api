import { describe, expect, it } from "vitest";
import { toCookbookSummary, uniqueIds } from "./cookbookStore";

describe("uniqueIds", () => {
  it("drops blanks and duplicates while keeping order of first seen", () => {
    expect(uniqueIds(["a", "", "b", "a", "c"])).toEqual(["a", "b", "c"]);
  });
});

describe("toCookbookSummary", () => {
  it("counts members and keeps the first four as mosaic previews", () => {
    const now = new Date("2026-03-15T12:00:00.000Z");
    const members = Array.from({ length: 5 }, (_, index) => ({
      id: `recipe-${index}`,
      userId: "user-1",
      title: `Recipe ${index}`,
      category: "pasta" as const,
      ingredients: [],
      steps: [],
      tags: [],
      uncertainties: [],
      source: { type: "manual" as const },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }));

    const summary = toCookbookSummary(
      {
        id: "book-1",
        userId: "user-1",
        name: "Weeknight dinners",
        createdAt: now,
        updatedAt: now,
      },
      members,
    );

    expect(summary.recipeCount).toBe(5);
    expect(summary.previewRecipes).toHaveLength(4);
    expect(summary.previewRecipes[0]?.id).toBe("recipe-0");
    expect(summary.name).toBe("Weeknight dinners");
  });
});
