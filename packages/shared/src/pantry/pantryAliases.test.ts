import { describe, expect, it } from "vitest";
import { normalizePantryAlias, sanitizePantryAliases } from "./pantryAliases";

describe("normalizePantryAlias", () => {
  it("folds case and diacritics like ingredient aliases", () => {
    expect(normalizePantryAlias("Feijão")).toBe("feijao");
    expect(normalizePantryAlias("  Fagioli  ")).toBe("fagioli");
  });
});

describe("sanitizePantryAliases", () => {
  it("includes display name and dedupes aliases", () => {
    expect(sanitizePantryAliases("Beans", ["feijão", "beans", "Fagioli"])).toEqual(["Beans", "feijão", "Fagioli"]);
  });

  it("rejects empty display name", () => {
    expect(() => sanitizePantryAliases("  ")).toThrow("Display name is required.");
  });
});
