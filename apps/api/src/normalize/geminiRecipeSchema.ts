import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import {
  FOOD_CATEGORIES,
  parseFoodCategory,
  type GeneratedRecipe,
  type Ingredient,
  type RecipeMacros,
  type RecipeNutrition,
  type RecipeSource,
  type RecipeStep,
} from "@savorly/shared";
import { AppError } from "../errors";

const GEMINI_TIMEOUT_MS = 60_000;
const GEMINI_MAX_OUTPUT_TOKENS = 8192;
const GEMINI_ATTEMPTS = 2;

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
    nutrition: {
      type: SchemaType.OBJECT,
      properties: {
        servingG: { type: SchemaType.NUMBER },
        servingKcal: { type: SchemaType.NUMBER },
        servingProteinG: { type: SchemaType.NUMBER },
        servingCarbsG: { type: SchemaType.NUMBER },
        servingFatG: { type: SchemaType.NUMBER },
        pintKcal: { type: SchemaType.NUMBER },
        pintProteinG: { type: SchemaType.NUMBER },
        pintCarbsG: { type: SchemaType.NUMBER },
        pintFatG: { type: SchemaType.NUMBER },
      },
      required: ["servingG", "servingKcal", "servingProteinG", "servingCarbsG", "servingFatG"],
    },
  },
  required: ["title", "category", "ingredients", "steps", "tags", "uncertainties", "nutrition"],
};

export const GEMINI_ADAPT_RECIPE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    ...(GEMINI_RECIPE_SCHEMA.properties as Record<string, Schema>),
    adaptSummary: { type: SchemaType.STRING },
  },
  required: [...(GEMINI_RECIPE_SCHEMA.required as string[]), "adaptSummary"],
};

const GEMINI_SUBSTITUTION_REPLACEMENT_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    name: { type: SchemaType.STRING },
    quantity: { type: SchemaType.NUMBER, nullable: true },
    unit: { type: SchemaType.STRING, nullable: true },
    notes: { type: SchemaType.STRING, nullable: true },
  },
  required: ["name"],
};

export const GEMINI_PANTRY_SUBSTITUTION_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    adaptSummary: { type: SchemaType.STRING },
    substitutions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          originalIngredientIndex: { type: SchemaType.NUMBER },
          pantryStapleLabel: { type: SchemaType.STRING },
          replacement: GEMINI_SUBSTITUTION_REPLACEMENT_SCHEMA,
          rationale: { type: SchemaType.STRING },
        },
        required: ["originalIngredientIndex", "pantryStapleLabel", "replacement", "rationale"],
      },
    },
  },
  required: ["adaptSummary", "substitutions"],
};

export function extractAdaptSummary(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object" || !("adaptSummary" in raw)) {
    return undefined;
  }
  const value = (raw as { adaptSummary?: unknown }).adaptSummary;
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

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
      maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
    },
    systemInstruction: options.systemInstruction,
  });

  try {
    let lastError: unknown;
    for (let attempt = 1; attempt <= GEMINI_ATTEMPTS; attempt += 1) {
      try {
        const started = Date.now();
        const result = await withTimeout(model.generateContent(options.userPrompt), GEMINI_TIMEOUT_MS, "Gemini");
        const text = modelText(result);
        console.info("Gemini generate finished", Date.now() - started, "ms", `attempt ${attempt}`, `chars ${text.length}`);
        return parseJsonPayload(text);
      } catch (error) {
        lastError = error;
        if (error instanceof AppError) throw error;
        const message = String(error instanceof Error ? error.message : error);
        console.error("Gemini call failed", message.slice(0, 400), `attempt ${attempt}`);
        if (attempt === GEMINI_ATTEMPTS || !isRetryableGeminiError(message)) {
          throw error;
        }
      }
    }
    throw lastError;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const message = String(error instanceof Error ? error.message : error).replaceAll(options.apiKey, "[redacted]");
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
    nutrition: parseRecipeNutrition(value.nutrition),
    source,
  };
}

export function parseRecipeNutrition(value: unknown): RecipeNutrition | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const servingG = nullableNumber(item.servingG);
  const nestedServing = parseMacros(item.perServing);
  if (servingG != null && nestedServing) {
    const nestedPint = parseMacros(item.perPint);
    return nestedPint ? { servingG, perServing: nestedServing, perPint: nestedPint } : { servingG, perServing: nestedServing };
  }

  const perServing = parseMacros({
    kcal: item.servingKcal,
    proteinG: item.servingProteinG,
    carbsG: item.servingCarbsG,
    fatG: item.servingFatG,
  });
  if (servingG == null || !perServing) return null;
  const perPint = parseMacros({
    kcal: item.pintKcal,
    proteinG: item.pintProteinG,
    carbsG: item.pintCarbsG,
    fatG: item.pintFatG,
  });
  return perPint ? { servingG, perServing, perPint } : { servingG, perServing };
}

function parseMacros(value: unknown): RecipeMacros | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const kcal = nullableNumber(item.kcal);
  const proteinG = nullableNumber(item.proteinG);
  const carbsG = nullableNumber(item.carbsG);
  const fatG = nullableNumber(item.fatG);
  if (kcal == null || proteinG == null || carbsG == null || fatG == null) return null;
  return { kcal, proteinG, carbsG, fatG };
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

function modelText(result: { response: { text: () => string; candidates?: Array<{ finishReason?: string }> } }): string {
  const finishReason = result.response.candidates?.[0]?.finishReason;
  try {
    const text = result.response.text().trim();
    if (!text) {
      throw new Error(`Gemini returned empty text (finishReason=${finishReason ?? "unknown"})`);
    }
    return text;
  } catch (error) {
    if (error instanceof Error && error.message.includes("finishReason=")) throw error;
    throw new Error(`Gemini returned no text (finishReason=${finishReason ?? "unknown"})`);
  }
}

function parseJsonPayload(text: string): unknown {
  const candidates = [text, repairGeminiJson(text)];
  let lastParseError = "";
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch (error) {
      lastParseError = error instanceof Error ? error.message : String(error);
    }
  }
  const preview = text.slice(Math.max(0, text.length - 220)).replaceAll("\n", "\\n");
  throw new Error(`Gemini returned invalid JSON (${text.length} chars): ${lastParseError} near: ${preview}`);
}

export function repairGeminiJson(text: string): string {
  let next = text.trim();
  const start = next.indexOf("{");
  if (start >= 0) {
    next = next.slice(start);
  }
  next = next.replace(/("notes"\s*:\s*)mix-in\b/gi, '$1"mix-in"');
  next = closeTruncatedJson(next);
  next = next.replace(/,\s*([}\]])/g, "$1");
  return next;
}

function closeTruncatedJson(text: string): string {
  let inString = false;
  let escaped = false;
  const stack: Array<"}" | "]"> = [];
  let next = "";
  for (const ch of text) {
    next += ch;
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      stack.push("}");
    } else if (ch === "[") {
      stack.push("]");
    } else if (ch === "}" || ch === "]") {
      stack.pop();
    }
  }
  if (inString) next += '"';
  next = next.replace(/,\s*$/, "");
  while (stack.length > 0) {
    next += stack.pop();
  }
  return next;
}

function isRetryableGeminiError(message: string): boolean {
  return (
    message.includes("invalid JSON") ||
    message.includes("Unexpected") ||
    message.includes("Expected") ||
    message.includes("timed out") ||
    message.includes("empty text") ||
    message.includes("no text")
  );
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
