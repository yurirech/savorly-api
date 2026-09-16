import type { GeneratedRecipe, RecipeGenerateRequest } from "@savorly/shared";
import type { Env } from "../config";
import { AppError } from "../errors";
import { generateGeminiJson, parseGeminiRecipe } from "../normalize/geminiRecipeSchema";
import { CREATE_AGENT_LABEL, composeSystemInstruction, composeUserMessage } from "./composeGeneratePrompt";
import { mockGeneratedCreate } from "./mockGenerate";

export async function generateRecipe(request: RecipeGenerateRequest, env: Env): Promise<GeneratedRecipe> {
  if (request.adaptNote?.trim() && !request.previousRecipe) {
    throw new AppError("validation_error", "Adapt needs the current recipe.", 400);
  }

  if (env.useMockImports) {
    return mockGeneratedCreate(request);
  }

  if (!env.geminiApiKey) {
    throw new AppError("normalizer_failed", "GEMINI_API_KEY is not configured.", 500);
  }

  const userPrompt = composeUserMessage(request);
  const parsed = await generateGeminiJson({
    apiKey: env.geminiApiKey,
    model: env.geminiModel,
    systemInstruction: composeSystemInstruction(request),
    userPrompt,
    temperature: 0.6,
    offerTextPaste: false,
    failureMessage: "Could not generate this recipe. Try a shorter adapt note.",
  });

  return parseGeminiRecipe(parsed, {
    type: "manual",
    sourceName: CREATE_AGENT_LABEL[request.agent],
    originalText: userPrompt,
  });
}
