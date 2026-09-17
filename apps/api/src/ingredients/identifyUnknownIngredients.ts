import { SchemaType, type Schema } from "@google/generative-ai";
import {
  applyPantrySnapshot,
  foldAlias,
  normalizeUnit,
  pantryByKey,
  pantryKeys,
  type Ingredient,
  type PantryIngredient,
} from "@savorly/shared";
import { generateGeminiJson } from "../normalize/geminiRecipeSchema";

export const MIN_GRAMS_PER_CUP = 20;
export const MAX_GRAMS_PER_CUP = 800;

const IDENTIFY_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          key: { type: SchemaType.STRING },
          gramsPerCup: { type: SchemaType.NUMBER },
          aliases: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ["name", "key", "gramsPerCup"],
      },
    },
  },
  required: ["items"],
};

export type IdentifiedIngredient = {
  name: string;
  key: string;
  gramsPerCup: number;
  aliases: string[];
};

export function needsIdentify(ingredient: Ingredient): boolean {
  const snapped = applyPantrySnapshot(ingredient);
  return (
    snapped.canonicalKey == null &&
    snapped.quantity != null &&
    Number.isFinite(snapped.quantity) &&
    normalizeUnit(snapped.unit) != null
  );
}

export function parseIdentifyItems(raw: unknown): IdentifiedIngredient[] {
  if (!raw || typeof raw !== "object") return [];
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.name !== "string" || !row.name.trim()) return [];
    const key = slugKey(typeof row.key === "string" ? row.key : row.name);
    if (!key) return [];
    const gramsPerCup = typeof row.gramsPerCup === "number" ? row.gramsPerCup : Number.NaN;
    const known = pantryByKey(key);
    const density = known?.gramsPerCup ?? gramsPerCup;
    if (!Number.isFinite(density) || density < MIN_GRAMS_PER_CUP || density > MAX_GRAMS_PER_CUP) {
      return [];
    }
    const aliases = Array.isArray(row.aliases) ? row.aliases.map(String).filter(Boolean) : [];
    return [
      {
        name: row.name.trim(),
        key,
        gramsPerCup: density,
        aliases: uniqueAliases([row.name, ...aliases, ...(known?.aliases ?? [])]),
      },
    ];
  });
}

export async function identifyUnknownIngredients(options: {
  apiKey: string;
  model: string;
  ingredients: Ingredient[];
}): Promise<PantryIngredient[]> {
  const unknown = options.ingredients.filter(needsIdentify);
  if (unknown.length === 0) return [];

  const raw = await generateGeminiJson({
    apiKey: options.apiKey,
    model: options.model,
    temperature: 0.1,
    offerTextPaste: false,
    failureMessage: "Could not identify ingredient conversions.",
    responseSchema: IDENTIFY_SCHEMA,
    systemInstruction: `Identify pantry staples for unit conversion between grams and cups.
Return one item per input name.
key must be snake_case. Prefer one of: ${pantryKeys().join(", ")}.
gramsPerCup is grams in one US cup (about 240ml). Only set it for a NEW key, not a known one.
Keep names in the source language.`,
    userPrompt: unknown.map((ingredient) => ingredient.name).join("\n"),
  });

  return parseIdentifyItems(raw).map((item) => ({
    key: item.key,
    gramsPerCup: item.gramsPerCup,
    aliases: item.aliases,
  }));
}

export function slugKey(value: string): string {
  return foldAlias(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
}

function uniqueAliases(values: string[]): string[] {
  const seen = new Set<string>();
  const aliases: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const folded = foldAlias(trimmed);
    if (!trimmed || seen.has(folded)) continue;
    seen.add(folded);
    aliases.push(trimmed);
  }
  return aliases;
}
