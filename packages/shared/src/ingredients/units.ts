export const CONVERT_UNITS = ["g", "cup", "tbsp", "tsp"] as const;

export type ConvertUnit = (typeof CONVERT_UNITS)[number];

export const TBSP_PER_CUP = 16;
export const TSP_PER_CUP = 48;

const UNIT_ALIASES: Record<string, ConvertUnit> = {
  g: "g",
  gram: "g",
  grams: "g",
  grammo: "g",
  grammi: "g",
  grama: "g",
  gramas: "g",
  cup: "cup",
  cups: "cup",
  tazza: "cup",
  tazze: "cup",
  xicara: "cup",
  xicaras: "cup",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  cucchiaio: "tbsp",
  cucchiai: "tbsp",
  "cucchiaio da minestra": "tbsp",
  "cucchiai da minestra": "tbsp",
  "colher de sopa": "tbsp",
  "colheres de sopa": "tbsp",
  cs: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  cucchiaino: "tsp",
  cucchiaini: "tsp",
  "cucchiaio da caffe": "tsp",
  "colher de cha": "tsp",
  "colheres de cha": "tsp",
  cc: "tsp",
};

export const UNIT_PHRASES = Object.keys(UNIT_ALIASES).sort((a, b) => b.length - a.length);

export function foldAlias(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[,;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeUnit(value: string | null | undefined): ConvertUnit | null {
  if (!value) return null;
  return UNIT_ALIASES[foldAlias(value)] ?? null;
}

export function isConvertUnit(value: string | null | undefined): value is ConvertUnit {
  return value === "g" || value === "cup" || value === "tbsp" || value === "tsp";
}
