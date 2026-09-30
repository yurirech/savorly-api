import { SchemaType, type Schema } from "@google/generative-ai";
import {
  FOOD_LABEL_NUTRIENT_KEYS,
  foodFromLabelDraft,
  type FoodLabelDraft,
  type FoodLabelFill,
  type Ingredient,
} from "@savorly/shared";
import type { Env } from "../config";
import { AppError } from "../errors";
import { generateGeminiJson } from "../normalize/geminiRecipeSchema";

const FOOD_LABEL_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    name: { type: SchemaType.STRING, nullable: true },
    basis: { type: SchemaType.STRING, format: "enum", enum: ["per_100g", "per_serving"] },
    servingWeightG: { type: SchemaType.NUMBER, nullable: true },
    ...Object.fromEntries(
      FOOD_LABEL_NUTRIENT_KEYS.map((key) => [key, { type: SchemaType.NUMBER, nullable: true }]),
    ),
  },
  required: ["basis"],
};

const RECIPE_TEXT_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING, nullable: true },
    servings: { type: SchemaType.NUMBER, nullable: true },
    ingredients: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          quantity: { type: SchemaType.NUMBER, nullable: true },
          unit: { type: SchemaType.STRING, nullable: true },
          lineKind: { type: SchemaType.STRING, format: "enum", enum: ["ingredient", "section"], nullable: true },
        },
        required: ["name"],
      },
    },
  },
  required: ["ingredients"],
};

const FOOD_PROMPT = `Extract a food label into the schema.

Rules:
- Use only facts in the text. Do not invent nutrients or amounts.
- Set basis to per_100g when the label is per 100 g. Otherwise set per_serving.
- Set servingWeightG only when the text states a gram weight for one serving or capsule. Otherwise null.
- Nutrients that are not mentioned are null.
- Copy a number only when the label already uses kcal, g, mg, or mcg for that nutrient.
- Convert IU only for these: vitamin D mcg = IU / 40, vitamin A mcg = IU / 3.33, vitamin E mg = IU / 1.49. Leave every other mismatched unit null.`;

const RECIPE_PROMPT = `Extract a diary recipe from the pasted text.

Rules:
- Use only facts in the text. Do not invent quantities.
- A heading such as "For the base" is an ingredient with lineKind "section", no quantity or unit, and a name ending with a colon.
- Keep the unit that was written. Use null quantity and unit when no amount is stated.
- servings is null when the text does not state it.`;

export type RecipeTextDraft = {
  title: string;
  servings: number;
  ingredients: Ingredient[];
};

export function foodFillFromGemini(raw: unknown): FoodLabelFill {
  const row = asRecord(raw);
  const nutrients: FoodLabelDraft["nutrients"] = {};
  for (const key of FOOD_LABEL_NUTRIENT_KEYS) {
    nutrients[key] = finiteNumber(row[key]);
  }
  return foodFromLabelDraft({
    name: typeof row.name === "string" ? row.name : null,
    basis: typeof row.basis === "string" ? row.basis : null,
    servingWeightG: finiteNumber(row.servingWeightG),
    nutrients,
  });
}

export function recipeDraftFromGemini(raw: unknown): RecipeTextDraft {
  const row = asRecord(raw);
  const title = typeof row.title === "string" && row.title.trim() ? row.title.trim().slice(0, 120) : "Recipe";
  const servingsValue = finiteNumber(row.servings);
  const servings = servingsValue != null && Number.isInteger(servingsValue) && servingsValue >= 1 ? servingsValue : 1;
  const ingredients = Array.isArray(row.ingredients) ? row.ingredients.flatMap(ingredientFromRaw) : [];
  return { title, servings, ingredients };
}

export async function draftFoodFromText(env: Env, text: string): Promise<FoodLabelFill> {
  const parsed = await generateGeminiJson({
    apiKey: requireGemini(env),
    model: env.geminiModel,
    systemInstruction: FOOD_PROMPT,
    userPrompt: text,
    temperature: 0.1,
    failureMessage: "Could not read that food label.",
    responseSchema: FOOD_LABEL_SCHEMA,
  });
  return foodFillFromGemini(parsed);
}

export async function draftRecipeFromText(env: Env, text: string): Promise<RecipeTextDraft> {
  const parsed = await generateGeminiJson({
    apiKey: requireGemini(env),
    model: env.geminiModel,
    systemInstruction: RECIPE_PROMPT,
    userPrompt: text,
    temperature: 0.1,
    failureMessage: "Could not read that recipe.",
    responseSchema: RECIPE_TEXT_SCHEMA,
  });
  return recipeDraftFromGemini(parsed);
}

function requireGemini(env: Env): string {
  if (!env.geminiApiKey) {
    throw new AppError("normalizer_failed", "Pasting text needs Gemini, and that is not set up on the server.", 500);
  }
  return env.geminiApiKey;
}

function ingredientFromRaw(raw: unknown): Ingredient[] {
  const row = asRecord(raw);
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (!name) return [];
  const lineKind = row.lineKind === "section" ? "section" : "ingredient";
  return [
    {
      name: name.slice(0, 200),
      quantity: finiteNumber(row.quantity),
      unit: typeof row.unit === "string" ? row.unit : null,
      lineKind,
    },
  ];
}

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
