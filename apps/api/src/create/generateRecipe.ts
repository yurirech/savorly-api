import type { GeneratedRecipe, RecipeGenerateRequest } from "@savorly/shared";
import type { Env } from "../config";
import type { Database } from "../db/client";
import { AppError } from "../errors";
import { resolveIngredients } from "../ingredients/resolveIngredients";
import { generateGeminiJson, parseGeminiRecipe } from "../normalize/geminiRecipeSchema";
import { CREATE_AGENT_LABEL, composeSystemInstruction, composeUserMessage } from "./composeGeneratePrompt";
import { mockGeneratedCreate } from "./mockGenerate";

export async function generateRecipe(
  request: RecipeGenerateRequest,
  env: Env,
  db?: Database,
): Promise<GeneratedRecipe> {
  if (request.adaptNote?.trim() && !request.previousRecipe) {
    throw new AppError("validation_error", "Adapt needs the current recipe.", 400);
  }

  const recipe = env.useMockImports
    ? mockGeneratedCreate(request)
    : await generateFromGemini(request, env);

  if (request.agent === "creami") {
    recipe.steps = [];
  }

  return resolveIngredients(recipe, { env, db });
}

async function generateFromGemini(request: RecipeGenerateRequest, env: Env): Promise<GeneratedRecipe> {
  if (!env.geminiApiKey) {
    throw new AppError("normalizer_failed", "GEMINI_API_KEY is not configured.", 500);
  }

  const userPrompt = composeUserMessage(request);
  const parsed = await generateGeminiJson({
    apiKey: env.geminiApiKey,
    model: env.geminiModel,
    systemInstruction: composeSystemInstruction(request),
    userPrompt,
    temperature: 0.35,
    offerTextPaste: false,
    failureMessage: "Could not generate this recipe. Try again.",
  });

  return parseGeminiRecipe(parsed, {
    type: "manual",
    sourceName: CREATE_AGENT_LABEL[request.agent],
    originalText: userPrompt,
  });
}
