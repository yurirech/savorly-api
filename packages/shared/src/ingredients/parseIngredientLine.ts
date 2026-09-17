import { lookupPantryKey } from "./dictionary";
import { foldAlias, normalizeUnit, UNIT_PHRASES } from "./units";
import type { Ingredient } from "../recipe";

const MIXED = /^(\d+)\s+(\d+)\s*\/\s*(\d+)/;
const FRACTION = /^(\d+)\s*\/\s*(\d+)/;
const DECIMAL = /^(\d+\.\d+)/;
const INTEGER = /^(\d+)/;

export function parseIngredientLine(line: string): Ingredient {
  const trimmed = line.trim();
  if (!trimmed) {
    return { name: "", quantity: null, unit: null, notes: null, canonicalKey: null, gramsPerCup: null };
  }

  const quantityMatch = leadingQuantity(trimmed);
  let rest = trimmed;
  let quantity: number | null = null;
  if (quantityMatch) {
    quantity = quantityMatch.value;
    rest = trimmed.slice(quantityMatch.length).trim();
  }

  let unit: string | null = null;
  const foldedRest = foldAlias(rest);
  for (const phrase of UNIT_PHRASES) {
    if (foldedRest === phrase || foldedRest.startsWith(`${phrase} `)) {
      unit = normalizeUnit(phrase);
      rest = sliceFoldedPrefix(rest, phrase);
      break;
    }
  }

  const { name, notes } = splitNameNotes(rest);
  return {
    name: name || trimmed,
    quantity,
    unit,
    notes,
    canonicalKey: null,
    gramsPerCup: null,
  };
}

export function parseIngredientLines(text: string, previous: Ingredient[] = []): Ingredient[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parsed = parseIngredientLine(line);
      const pantry = lookupPantryKey(parsed.name);
      if (pantry) {
        return { ...parsed, canonicalKey: pantry.key, gramsPerCup: pantry.gramsPerCup };
      }
      const prev =
        previous.find((item) => foldAlias(item.name) === foldAlias(parsed.name)) ?? previous[index];
      if (prev && foldAlias(prev.name) === foldAlias(parsed.name)) {
        return { ...parsed, canonicalKey: prev.canonicalKey ?? null, gramsPerCup: prev.gramsPerCup ?? null };
      }
      return parsed;
    });
}

function leadingQuantity(line: string): { value: number; length: number } | null {
  const mixed = MIXED.exec(line);
  if (mixed) {
    const whole = Number(mixed[1]);
    const num = Number(mixed[2]);
    const den = Number(mixed[3]);
    if (den > 0) {
      return { value: whole + num / den, length: mixed[0].length };
    }
  }
  const fraction = FRACTION.exec(line);
  if (fraction) {
    const num = Number(fraction[1]);
    const den = Number(fraction[2]);
    if (den > 0) {
      return { value: num / den, length: fraction[0].length };
    }
  }
  const decimal = DECIMAL.exec(line);
  if (decimal) {
    return { value: Number(decimal[1]), length: decimal[0].length };
  }
  const integer = INTEGER.exec(line);
  if (!integer) return null;
  if (integer[1].length > 1 && integer[1].startsWith("0")) {
    return null;
  }
  const after = line.slice(integer[0].length);
  if (after && !/^\s/.test(after)) {
    return null;
  }
  return { value: Number(integer[1]), length: integer[0].length };
}

function sliceFoldedPrefix(text: string, foldedPrefix: string): string {
  const words = text.trim().split(/\s+/);
  let consumed = "";
  for (let i = 0; i < words.length; i += 1) {
    consumed = consumed ? `${consumed} ${words[i]}` : words[i];
    if (foldAlias(consumed) === foldedPrefix) {
      return words.slice(i + 1).join(" ");
    }
  }
  return text;
}

function splitNameNotes(rest: string): { name: string; notes: string | null } {
  const trimmed = rest.trim();
  const paren = /^(.*?)\s*\((.+)\)\s*$/.exec(trimmed);
  if (paren?.[1] && paren[2]) {
    return { name: paren[1].trim(), notes: paren[2].trim() };
  }
  const comma = trimmed.indexOf(", ");
  if (comma > 0) {
    return { name: trimmed.slice(0, comma).trim(), notes: trimmed.slice(comma + 2).trim() };
  }
  return { name: trimmed, notes: null };
}
