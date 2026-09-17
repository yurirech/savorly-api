import { describe, expect, it } from "vitest";
import { recipeNotesText } from "./recipe";

describe("recipeNotesText", () => {
  it("joins notes and leftover import remarks", () => {
    expect(
      recipeNotesText({
        notes: "Use room-temp eggs",
        uncertainties: ["Oven time was not specified."],
      }),
    ).toBe("Use room-temp eggs\nOven time was not specified.");
  });

  it("returns an empty string when both are blank", () => {
    expect(recipeNotesText({ notes: "  ", uncertainties: [] })).toBe("");
  });
});
