import { describe, expect, it } from "vitest";
import { STARTER_PANTRY_STAPLES } from "@savorly/shared";
import { itemFromRow } from "./pantryStore";

describe("itemFromRow", () => {
  it("maps database row to API shape", () => {
    const now = new Date("2026-03-15T12:00:00.000Z");
    const item = itemFromRow({
      id: "00000000-0000-0000-0000-000000000001",
      userId: "00000000-0000-0000-0000-000000000002",
      starterKey: "beans",
      displayName: "Beans",
      aliases: ["Beans", "feijão"],
      createdAt: now,
      updatedAt: now,
    });
    expect(item.starterKey).toBe("beans");
    expect(item.aliases).toContain("feijão");
    expect(item.createdAt).toBe(now.toISOString());
  });
});

describe("starter catalog", () => {
  it("has about twenty unique starter keys", () => {
    expect(STARTER_PANTRY_STAPLES.length).toBeGreaterThanOrEqual(18);
    expect(STARTER_PANTRY_STAPLES.length).toBeLessThanOrEqual(24);
    const keys = STARTER_PANTRY_STAPLES.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
