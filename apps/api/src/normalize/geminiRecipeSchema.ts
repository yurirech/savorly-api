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

export const GEMINI_RECIPE_SCHEMA: Schema = {
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
          canonicalKey: { type: SchemaType.STRING, nullable: true },
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

export async function generateGeminiJson(options: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  userPrompt: string;
  temperature: number;
  failureMessage?: string;
  offerTextPaste?: boolean;
  responseSchema?: Schema;
}): Promise<unknown> {
  const genAI = new GoogleGenerativeAI(options.apiKey);
  const model = genAI.getGenerativeModel({
    model: options.model,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: options.responseSchema ?? GEMINI_RECIPE_SCHEMA,
      temperature: options.temperature,
    },
    systemInstruction: options.systemInstruction,
  });

  try {
    const result = await model.generateContent(options.userPrompt);
    return JSON.parse(result.response.text()) as unknown;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const message = String(error instanceof Error ? error.message : error).replaceAll(options.apiKey, "[redacted]");
    console.error("Gemini call failed", message.slice(0, 400));
    throw new AppError(
      "normalizer_failed",
      options.failureMessage ?? geminiFailureMessage(message),
      502,
      options.offerTextPaste ?? true,
    );
  }
}

export function parseGeminiRecipe(raw: unknown, source: RecipeSource): GeneratedRecipe {
  if (!raw || typeof raw !== "object") {
    throw new AppError("normalizer_failed", "The recipe normalizer returned invalid data.", 502, true);
  }
  const value = raw as Record<string, unknown>;
  const title = typeof value.title === "string" && value.title.trim() ? value.title.trim() : "Untitled recipe";
  const ingredients = Array.isArray(value.ingredients)
    ? (value.ingredients.map(toIngredient).filter(Boolean) as Ingredient[])
    : [];
  const steps = Array.isArray(value.steps) ? (value.steps.map(toStep).filter(Boolean) as RecipeStep[]) : [];

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
    source,
  };
}

export function geminiFailureMessage(message: string): string {
  if (message.includes("no longer available") || message.includes("[404")) {
    return "Gemini model is unavailable. Check GEMINI_MODEL in the API .env.";
  }
  if (message.includes("[401") || message.includes("API key")) {
    return "Gemini rejected the API key. Create a new key in Google AI Studio.";
  }
  return "Could not normalize this recipe. Try pasting the text instead.";
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
    canonicalKey: typeof item.canonicalKey === "string" && item.canonicalKey.trim() ? item.canonicalKey.trim() : null,
    gramsPerCup: null,
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
