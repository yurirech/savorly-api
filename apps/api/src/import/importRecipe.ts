import type { GeneratedRecipe, RecipeImportRequest } from "@savorly/shared";
import type { Env } from "../config";
import { AppError } from "../errors";
import { InstagramRecipeImporter } from "../importers/InstagramRecipeImporter";
import { mockGeneratedRecipe, mockImportedSource } from "../importers/mockImports";
import { TextRecipeImporter } from "../importers/TextRecipeImporter";
import type { ImportedRecipeSource } from "../importers/types";
import { WebsiteRecipeImporter } from "../importers/WebsiteRecipeImporter";
import { normalizeImportedSource } from "../normalize/geminiNormalizer";

export async function importRecipe(
  request: RecipeImportRequest,
  env: Env,
): Promise<GeneratedRecipe> {
  const imported = env.useMockImports
    ? mockImportedSource(request.type)
    : await runImporter(request, env);

  if (env.useMockImports || !env.geminiApiKey) {
    if (!env.useMockImports && !env.geminiApiKey) {
      throw new AppError("normalizer_failed", "GEMINI_API_KEY is not configured.", 500);
    }
    return mockGeneratedRecipe(imported);
  }

  return normalizeImportedSource({
    apiKey: env.geminiApiKey,
    model: env.geminiModel,
    imported,
  });
}

async function runImporter(request: RecipeImportRequest, env: Env): Promise<ImportedRecipeSource> {
  if (request.type === "text") {
    return new TextRecipeImporter().import(request);
  }

  if (request.type === "website") {
    return new WebsiteRecipeImporter().import(request);
  }

  if (!env.apifyToken) {
    throw new AppError("import_blocked", "Instagram import is not configured.", 500, true);
  }

  return new InstagramRecipeImporter(env.apifyToken, env.apifyInstagramActor).import(request);
}
