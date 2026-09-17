import type { GeneratedRecipe, RecipeImportRequest } from "@savorly/shared";
import type { Env } from "../config";
import type { Database } from "../db/client";
import { AppError } from "../errors";
import { resolveIngredients } from "../ingredients/resolveIngredients";
import { InstagramRecipeImporter } from "../importers/InstagramRecipeImporter";
import { mockGeneratedRecipe, mockImportedSource } from "../importers/mockImports";
import { TextRecipeImporter } from "../importers/TextRecipeImporter";
import type { ImportedRecipeSource } from "../importers/types";
import { WebsiteRecipeImporter } from "../importers/WebsiteRecipeImporter";
import { normalizeImportedSource } from "../normalize/geminiNormalizer";

export async function importRecipe(
  request: RecipeImportRequest,
  env: Env,
  db?: Database,
): Promise<GeneratedRecipe> {
  const imported = env.useMockImports
    ? mockImportedSource(request.type)
    : await runImporter(request, env);

  if (env.useMockImports || !env.geminiApiKey) {
    if (!env.useMockImports && !env.geminiApiKey) {
      throw new AppError("normalizer_failed", "GEMINI_API_KEY is not configured.", 500);
    }
    return resolveIngredients(mockGeneratedRecipe(imported), { env, db });
  }

  const recipe = await normalizeImportedSource({
    apiKey: env.geminiApiKey,
    model: env.geminiModel,
    imported,
  });
  return resolveIngredients(recipe, { env, db });
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
