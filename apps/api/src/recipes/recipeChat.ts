import type { GeneratedRecipe, SavedRecipe } from "@savorly/shared";
import type { Env } from "../config";
import { AppError } from "../errors";
import {
  extractAdaptSummary,
  GEMINI_ADAPT_RECIPE_SCHEMA,
  generateGeminiJson,
  parseGeminiRecipe,
} from "../normalize/geminiRecipeSchema";

export const RECIPE_CHAT_INSTRUCTION = `You are editing one existing recipe. Do not propose or create a different dish.
Change only what the user asked: make it healthier, replace ingredients, translate the title, ingredients, steps, and notes, or another edit they describe.
A translation changes the language of those strings. The dish, amounts, and method stay the same. category stays one of the existing English category values.
If the request cannot be done by editing this recipe, say so in adaptSummary and return the recipe unchanged.
adaptSummary is a short reply about what you changed on this recipe.`;

const HISTORY_LIMIT = 8;
const TEXT_LIMIT = 500;

export type RecipeChatTurn = {
  role: "user" | "assistant";
  text: string;
};

export type RecipeChatInput = {
  message: string;
  recipe?: GeneratedRecipe;
  history?: RecipeChatTurn[];
};

export async function chatAboutRecipe(
  saved: SavedRecipe,
  input: RecipeChatInput,
  env: Env,
): Promise<{ reply: string; recipe: GeneratedRecipe }> {
  const message = input.message.trim();
  if (!message) {
    throw new AppError("validation_error", "Write a message about this recipe.", 400);
  }
  const working = input.recipe ?? asGenerated(saved);
  if (env.useMockImports) {
    return { reply: "This stays the same recipe.", recipe: working };
  }
  if (!env.geminiApiKey) {
    throw new AppError("normalizer_failed", "GEMINI_API_KEY is not configured.", 500);
  }

  const parsed = await generateGeminiJson({
    apiKey: env.geminiApiKey,
    model: env.geminiModel,
    systemInstruction: RECIPE_CHAT_INSTRUCTION,
    userPrompt: userPrompt(working, message, input.history ?? []),
    temperature: 0.2,
    offerTextPaste: false,
    failureMessage: "Could not change this recipe. Try again.",
    responseSchema: GEMINI_ADAPT_RECIPE_SCHEMA,
  });

  return {
    reply: extractAdaptSummary(parsed) ?? "Updated this recipe.",
    recipe: parseGeminiRecipe(parsed, saved.source),
  };
}

function userPrompt(recipe: GeneratedRecipe, message: string, history: RecipeChatTurn[]): string {
  const turns = history
    .slice(-HISTORY_LIMIT)
    .map((turn) => `${turn.role}: ${turn.text.trim().slice(0, TEXT_LIMIT)}`)
    .join("\n");
  return [
    "Edit only this recipe. Do not invent a new one.",
    JSON.stringify(recipe),
    turns ? `Conversation so far:\n${turns}` : "",
    `User: ${message.slice(0, 2000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function asGenerated(saved: SavedRecipe): GeneratedRecipe {
  return {
    title: saved.title,
    category: saved.category,
    servings: saved.servings,
    prepTimeMinutes: saved.prepTimeMinutes,
    cookTimeMinutes: saved.cookTimeMinutes,
    ingredients: saved.ingredients,
    steps: saved.steps,
    tags: saved.tags,
    notes: saved.notes,
    uncertainties: saved.uncertainties,
    nutrition: saved.nutrition,
    source: saved.source,
  };
}
