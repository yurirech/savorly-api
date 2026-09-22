import type { GeneratedRecipe, RecipeGenerateRequest } from "@savorly/shared";
import type { Env } from "../config";
import type { Database } from "../db/client";
import { AppError } from "../errors";
import { resolveIngredients } from "../ingredients/resolveIngredients";
import {
  extractAdaptSummary,
  GEMINI_ADAPT_RECIPE_SCHEMA,
  GEMINI_RECIPE_SCHEMA,
  generateGeminiJson,
  parseGeminiRecipe,
} from "../normalize/geminiRecipeSchema";
import {
  CREATE_AGENT_LABEL,
  composeSystemInstruction,
  composeUserMessage,
  isAdaptRequest,
} from "./composeGeneratePrompt";
import { mockAdaptSummary, mockGeneratedCreate } from "./mockGenerate";
import { summarizeRecipeDiff } from "./summarizeRecipeDiff";
import { normalizeBakeRecipe } from "./validateBakeRecipe";
import { normalizeBreadRecipe } from "./validateBreadRecipe";
import { normalizeChefRecipe } from "./validateChefRecipe";
import { normalizeCreamiRecipe } from "./validateCreamiRecipe";

export type GenerateRecipeResult = {
  recipe: GeneratedRecipe;
  adaptSummary?: string;
};

export async function generateRecipe(
  request: RecipeGenerateRequest,
  env: Env,
  db?: Database,
): Promise<GenerateRecipeResult> {
  if ((request.adaptNote?.trim() || request.adaptGoal?.trim()) && !request.previousRecipe) {
    throw new AppError("validation_error", "Adapt needs the current recipe.", 400);
  }

  const adapting = isAdaptRequest(request);
  let adaptSummary: string | undefined;

  let recipe: GeneratedRecipe;
  if (env.useMockImports) {
    recipe = mockGeneratedCreate(request);
    if (adapting) {
      adaptSummary = mockAdaptSummary(request);
    }
  } else {
    const gemini = await generateFromGemini(request, env);
    recipe = gemini.recipe;
    adaptSummary = gemini.adaptSummary;
  }

  if (request.agent === "creami") {
    recipe = normalizeCreamiRecipe(recipe, request);
    recipe.steps = [];
  }

  if (request.agent === "chef") {
    recipe = normalizeChefRecipe(recipe, request);
  }

  if (request.agent === "bread") {
    recipe = normalizeBreadRecipe(recipe, request);
  }

  if (request.agent === "bake") {
    recipe = normalizeBakeRecipe(recipe, request);
  }

  recipe = await resolveIngredients(recipe, { env, db });

  if (adapting && request.previousRecipe) {
    if (!adaptSummary?.trim()) {
      adaptSummary = summarizeRecipeDiff(request.previousRecipe, recipe);
    }
  }

  const trimmedSummary = adaptSummary?.trim();
  return {
    recipe,
    adaptSummary: trimmedSummary && trimmedSummary.length > 0 ? trimmedSummary : undefined,
  };
}

async function generateFromGemini(
  request: RecipeGenerateRequest,
  env: Env,
): Promise<{ recipe: GeneratedRecipe; adaptSummary?: string }> {
  if (!env.geminiApiKey) {
    throw new AppError("normalizer_failed", "GEMINI_API_KEY is not configured.", 500);
  }

  const adapting = isAdaptRequest(request);
  const userPrompt = composeUserMessage(request);
  const parsed = await generateGeminiJson({
    apiKey: env.geminiApiKey,
    model: env.geminiModel,
    systemInstruction: composeSystemInstruction(request),
    userPrompt,
    temperature: 0.35,
    offerTextPaste: false,
    failureMessage: "Could not generate this recipe. Try again.",
    responseSchema: adapting ? GEMINI_ADAPT_RECIPE_SCHEMA : GEMINI_RECIPE_SCHEMA,
  });

  const adaptSummary = adapting ? extractAdaptSummary(parsed) : undefined;
  const recipe = parseGeminiRecipe(parsed, {
    type: "manual",
    sourceName: CREATE_AGENT_LABEL[request.agent],
    originalText: userPrompt,
  });

  return { recipe, adaptSummary };
}
