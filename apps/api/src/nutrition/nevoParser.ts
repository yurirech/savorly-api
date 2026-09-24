import type { NutrientVector } from "@savorly/shared";
import { NEVO_NUTRIENT_COLUMNS } from "./nevoNutrientColumns";

export const NEVO_DATA_VERSION = "2025/9.0";

export type ParsedNevoFood = {
  nevoCode: number;
  foodGroupNl: string;
  nameNl: string;
  nameEn: string;
  per100g: NutrientVector;
};

export function parseNevoDelimitedLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "|" && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  fields.push(current);
  return fields;
}

export function parseNevoNumber(raw: string | undefined): number | null {
  const trimmed = raw?.trim().replace(/^"|"$/g, "") ?? "";
  if (!trimmed || trimmed === "—" || trimmed === "-") {
    return null;
  }
  const normalized = trimmed.replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function columnIndex(headers: string[], needle: string): number {
  const index = headers.findIndex((header) => header.includes(needle));
  if (index < 0) {
    throw new Error(`NEVO CSV is missing column: ${needle}`);
  }
  return index;
}

export function parseNevoCsv(text: string): ParsedNevoFood[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return [];
  }

  const headers = parseNevoDelimitedLine(lines[0]!);
  const codeIdx = columnIndex(headers, "NEVO-code");
  const groupIdx = columnIndex(headers, "Voedingsmiddelgroep");
  const nameNlIdx = columnIndex(headers, "Voedingsmiddelnaam");
  const nameEnIdx = columnIndex(headers, "Engelse naam");
  const kcalIdx = columnIndex(headers, "ENERCC (kcal)");
  const proteinIdx = columnIndex(headers, "PROT (g)");
  const carbsIdx = columnIndex(headers, "CHO (g)");
  const fatIdx = columnIndex(headers, "FAT (g)");

  const optionalColumnIndices = NEVO_NUTRIENT_COLUMNS.map((entry) => ({
    field: entry.field,
    index: headers.findIndex((header) => header.includes(entry.headerIncludes)),
  })).filter((entry) => entry.index >= 0);

  const foods: ParsedNevoFood[] = [];

  for (const line of lines.slice(1)) {
    const row = parseNevoDelimitedLine(line);
    const nevoCode = parseNevoNumber(row[codeIdx]);
    if (nevoCode == null || nevoCode <= 0) {
      continue;
    }

    const nameNl = row[nameNlIdx]?.trim() ?? "";
    if (!nameNl) {
      continue;
    }

    const kcal = parseNevoNumber(row[kcalIdx]);
    const proteinG = parseNevoNumber(row[proteinIdx]);
    const carbsG = parseNevoNumber(row[carbsIdx]);
    const fatG = parseNevoNumber(row[fatIdx]);

    if ([kcal, proteinG, carbsG, fatG].some((value) => value == null)) {
      continue;
    }

    const per100g: NutrientVector = {
      kcal: kcal!,
      proteinG: proteinG!,
      carbsG: carbsG!,
      fatG: fatG!,
    };

    for (const { field, index } of optionalColumnIndices) {
      const parsed = parseNevoNumber(row[index]);
      if (parsed != null) {
        per100g[field] = parsed;
      }
    }

    foods.push({
      nevoCode: Math.trunc(nevoCode),
      foodGroupNl: row[groupIdx]?.trim() ?? "",
      nameNl,
      nameEn: row[nameEnIdx]?.trim() ?? "",
      per100g,
    });
  }

  return foods;
}

export function nevoSearchText(food: Pick<ParsedNevoFood, "nameNl" | "nameEn" | "foodGroupNl">): string {
  return [food.nameNl, food.nameEn, food.foodGroupNl].filter(Boolean).join(" ").toLowerCase();
}
