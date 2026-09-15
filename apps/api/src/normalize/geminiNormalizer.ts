import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import {
  FOOD_CATEGORIES,
  parseFoodCategory,
  type GeneratedRecipe,
  type Ingredient,
  type RecipeSource,
  type RecipeStep,
} from "@savorly/shared";
import { AppError } from "../errors";
import type { ImportedRecipeSource } from "../importers/types";

const RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    category: { type: SchemaType.STRING, format: "enum", enum: [...FOOD_CATEGORIES] },
    servings: { type: SchemaType.NUMBER, nullable: true },
    prepTimeMinutes: { type: SchemaType.NUMBER, nullable: true },
    cookTimeMinutes: { type: SchemaType.NUMBER, nullable: true },
    ingredients: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          quantity: { type: SchemaType.NUMBER, nullable: true },
          unit: { type: SchemaType.STRING, nullable: true },
          notes: { type: SchemaType.STRING, nullable: true },
        },
        required: ["name"],
      },
    },
    steps: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          order: { type: SchemaType.NUMBER },
          text: { type: SchemaType.STRING },
          durationMinutes: { type: SchemaType.NUMBER, nullable: true },
          temperatureC: { type: SchemaType.NUMBER, nullable: true },
        },
        required: ["order", "text"],
      },
    },
    tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    notes: { type: SchemaType.STRING, nullable: true },
    uncertainties: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ["title", "category", "ingredients", "steps", "tags", "uncertainties"],
};

const SYSTEM_PROMPT = `You normalize informal cooking text into a structured recipe.

Rules:
- Use only facts present in the source. Never invent missing quantities, temperatures, or timings.
- If a quantity, temperature, or duration is not explicitly stated, set that field to null and add a short note to uncertainties.
- Pick exactly one category from the provided enum. If unsure, use "other".
- Keep ingredient names concrete. Do not add pantry items that were not mentioned.
- Preserve the cooking method described by the source.`;

export async function normalizeImportedSource(options: {
  apiKey: string;
  model: string;
  imported: ImportedRecipeSource;
}): Promise<GeneratedRecipe> {
  const genAI = new GoogleGenerativeAI(options.apiKey);
  const model = genAI.getGenerativeModel({
    model: options.model,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.2,
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  const prompt = buildPrompt(options.imported);
  let parsed: unknown;
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new AppError("normalizer_failed", "Could not normalize this recipe. Try pasting the text instead.", 502, true);
  }

  return toGeneratedRecipe(parsed, options.imported);
}

export function toGeneratedRecipe(raw: unknown, imported: ImportedRecipeSource): GeneratedRecipe {
  if (!raw || typeof raw !== "object") {
    throw new AppError("normalizer_failed", "The recipe normalizer returned invalid data.", 502, true);
  }
  const value = raw as Record<string, unknown>;
  const title = typeof value.title === "string" && value.title.trim() ? value.title.trim() : "Untitled recipe";
  const ingredients = Array.isArray(value.ingredients) ? value.ingredients.map(toIngredient).filter(Boolean) as Ingredient[] : [];
  const steps = Array.isArray(value.steps) ? value.steps.map(toStep).filter(Boolean) as RecipeStep[] : [];

  if (ingredients.length === 0 && steps.length === 0) {
    throw new AppError("normalizer_failed", "No ingredients or steps could be extracted.", 422, true);
  }

  return {
    title,
    category: parseFoodCategory(String(value.category ?? "other")),
    servings: nullableNumber(value.servings),
    prepTimeMinutes: nullableNumber(value.prepTimeMinutes),
    cookTimeMinutes: nullableNumber(value.cookTimeMinutes),
    ingredients,
    steps,
    tags: Array.isArray(value.tags) ? value.tags.map(String).filter(Boolean) : [],
    notes: typeof value.notes === "string" ? value.notes : null,
    uncertainties: Array.isArray(value.uncertainties) ? value.uncertainties.map(String).filter(Boolean) : [],
    source: toRecipeSource(imported),
  };
}

function toRecipeSource(imported: ImportedRecipeSource): RecipeSource {
  return {
    type: imported.sourceType,
    originalUrl: imported.originalUrl,
    sourceName: imported.sourceName,
    author: imported.author,
    caption: imported.caption,
    transcript: imported.transcript,
    originalText: imported.originalText,
  };
}

function toIngredient(value: unknown): Ingredient | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Record<string, unknown>;
  if (typeof item.name !== "string" || !item.name.trim()) return undefined;
  return {
    name: item.name.trim(),
    quantity: nullableNumber(item.quantity),
    unit: typeof item.unit === "string" ? item.unit : null,
    notes: typeof item.notes === "string" ? item.notes : null,
  };
}

function toStep(value: unknown, index: number): RecipeStep | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Record<string, unknown>;
  if (typeof item.text !== "string" || !item.text.trim()) return undefined;
  return {
    order: typeof item.order === "number" ? item.order : index + 1,
    text: item.text.trim(),
    durationMinutes: nullableNumber(item.durationMinutes),
    temperatureC: nullableNumber(item.temperatureC),
  };
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildPrompt(imported: ImportedRecipeSource): string {
  const provenance = [
    `sourceType: ${imported.sourceType}`,
    imported.sourceName ? `sourceName: ${imported.sourceName}` : "",
    imported.author ? `author: ${imported.author}` : "",
    imported.originalUrl ? `originalUrl: ${imported.originalUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `${provenance}

Source content:
${imported.extractedText}`;
}
