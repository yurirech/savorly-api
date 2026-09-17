import { describe, expect, it } from "vitest";
import { lookupPantryKey, pantryByKey } from "./dictionary";
import { normalizeUnit } from "./units";

describe("units", () => {
  it("normalizes EN, IT, and PT-BR unit names", () => {
    expect(normalizeUnit("tablespoons")).toBe("tbsp");
    expect(normalizeUnit("cucchiaio")).toBe("tbsp");
    expect(normalizeUnit("colheres de sopa")).toBe("tbsp");
    expect(normalizeUnit("c.s.")).toBe("tbsp");
    expect(normalizeUnit("xícara")).toBe("cup");
    expect(normalizeUnit("tazza")).toBe("cup");
    expect(normalizeUnit("cucchiaino")).toBe("tsp");
    expect(normalizeUnit("colheres de chá")).toBe("tsp");
    expect(normalizeUnit("grammi")).toBe("g");
    expect(normalizeUnit("gramas")).toBe("g");
    expect(normalizeUnit("clove")).toBeNull();
  });
});

describe("dictionary aliases", () => {
  it("maps English, Italian, and Brazilian Portuguese names onto the same keys", () => {
    expect(lookupPantryKey("plain flour")?.key).toBe("all_purpose_flour");
    expect(lookupPantryKey("farina")?.key).toBe("all_purpose_flour");
    expect(lookupPantryKey("farinha de trigo")?.key).toBe("all_purpose_flour");
    expect(lookupPantryKey("farina 00")?.key).toBe("tipo_00_flour");
    expect(lookupPantryKey("açúcar")?.key).toBe("granulated_sugar");
    expect(lookupPantryKey("burro")?.key).toBe("unsalted_butter");
    expect(lookupPantryKey("manteiga")?.key).toBe("unsalted_butter");
    expect(lookupPantryKey("azeite")?.key).toBe("olive_oil");
    expect(lookupPantryKey("tipo_00_flour")?.gramsPerCup).toBe(pantryByKey("tipo_00_flour")?.gramsPerCup);
  });

  it("does not collapse 00 flour into all-purpose", () => {
    expect(lookupPantryKey("00 flour")?.key).toBe("tipo_00_flour");
    expect(lookupPantryKey("farinha tipo 00")?.key).toBe("tipo_00_flour");
    expect(lookupPantryKey("AP flour")?.key).toBe("all_purpose_flour");
  });
});
