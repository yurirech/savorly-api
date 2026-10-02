import { describe, expect, it } from "vitest";
import { nevoDisplayName, nevoEnglishRenames } from "./nevoNames";

describe("nevoDisplayName", () => {
  it("prefers a non-empty English name", () => {
    expect(nevoDisplayName("Milk semi-skimmed", "Melk halfvolle")).toBe("Milk semi-skimmed");
    expect(nevoDisplayName("  Oat drink  ", "Haverdrank")).toBe("Oat drink");
  });

  it("falls back to Dutch when English is missing", () => {
    expect(nevoDisplayName("", "Haverdrank")).toBe("Haverdrank");
    expect(nevoDisplayName(null, "Haverdrank")).toBe("Haverdrank");
  });
});

describe("nevoEnglishRenames", () => {
  it("renames only when English differs and is present", () => {
    const changes = nevoEnglishRenames(
      [
        { id: "a", name: "Melk halfvolle", nevoCode: 286 },
        { id: "b", name: "Milk semi-skimmed", nevoCode: 286 },
        { id: "c", name: "Haverdrank", nevoCode: 1 },
        { id: "d", name: "Peanut butter", nevoCode: null },
      ],
      new Map([
        [286, "Milk semi-skimmed"],
        [1, ""],
      ]),
    );
    expect(changes).toEqual([{ id: "a", name: "Milk semi-skimmed" }]);
  });
});
