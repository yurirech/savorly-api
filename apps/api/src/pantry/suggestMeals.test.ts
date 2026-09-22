import { describe, expect, it } from "vitest";
import { parseMealSuggestionExcludeIds } from "./suggestMeals";

describe("parseMealSuggestionExcludeIds", () => {
  it("returns empty list for blank input", () => {
    expect(parseMealSuggestionExcludeIds(undefined)).toEqual([]);
    expect(parseMealSuggestionExcludeIds("  ")).toEqual([]);
  });

  it("splits comma-separated ids", () => {
    const a = "00000000-0000-0000-0000-000000000001";
    const b = "00000000-0000-0000-0000-000000000002";
    expect(parseMealSuggestionExcludeIds(`${a}, ${b}`)).toEqual([a, b]);
  });
});
