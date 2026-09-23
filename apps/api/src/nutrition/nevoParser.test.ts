import { describe, expect, it } from "vitest";
import { parseNevoCsv, parseNevoDelimitedLine, parseNevoNumber } from "./nevoParser";

describe("parseNevoNumber", () => {
  it("parses Dutch decimal commas", () => {
    expect(parseNevoNumber('"3,4"')).toBe(3.4);
  });
});

describe("parseNevoDelimitedLine", () => {
  it("splits pipe fields and strips quotes", () => {
    expect(parseNevoDelimitedLine('a|"b|c"|d')).toEqual(["a", "b|c", "d"]);
  });
});

describe("parseNevoCsv", () => {
  it("maps macro columns from a NEVO row", () => {
    const header = [
      "NEVO-versie",
      "Voedingsmiddelgroep",
      "Food group",
      "NEVO-code",
      "Voedingsmiddelnaam/Dutch food name",
      "Engelse naam/Food name",
      "Synoniem",
      "Hoeveelheid/Quantity",
      "Opmerking",
      "Bevat sporen van/Contains traces of",
      "Is verrijkt met/Is fortified with",
      "ENERCJ (kJ)",
      "ENERCC (kcal)",
      "WATER (g)",
      "PROT (g)",
      "PROTPL (g)",
      "PROTAN (g)",
      "NT (g)",
      "TRP (mg)",
      "FAT (g)",
      "FACID (g)",
      "FASAT (g)",
      "FAMSCIS (g)",
      "FAPU (g)",
      "FAPUN3 (g)",
      "FAPUN6 (g)",
      "FATRS (g)",
      "CHO (g)",
    ].join("|");
    const row = [
      "NEVO-Online 2025 9.0",
      "Melk en melkproducten",
      "Milk and milk products",
      "286",
      "Melk halfvolle",
      "Milk semi-skimmed",
      "",
      "per 100g",
      "",
      "",
      "",
      "190",
      "45",
      "89,4",
      "3,4",
      "0",
      "3,4",
      "",
      "47",
      "1,4",
      "1,4",
      "0,9",
      "0,3",
      "0",
      "0",
      "0",
      "0",
      "4,7",
    ].join("|");
    const foods = parseNevoCsv(`${header}\n${row}`);
    expect(foods).toHaveLength(1);
    expect(foods[0]?.nevoCode).toBe(286);
    expect(foods[0]?.nameNl).toBe("Melk halfvolle");
    expect(foods[0]?.per100g).toEqual({ kcal: 45, proteinG: 3.4, carbsG: 4.7, fatG: 1.4 });
  });
});
