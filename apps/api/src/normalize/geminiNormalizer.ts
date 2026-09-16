import type { GeneratedRecipe } from "@savorly/shared";
import type { ImportedRecipeSource } from "../importers/types";
import { generateGeminiJson, parseGeminiRecipe } from "./geminiRecipeSchema";

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
  const parsed = await generateGeminiJson({
    apiKey: options.apiKey,
    model: options.model,
    systemInstruction: SYSTEM_PROMPT,
    userPrompt: buildPrompt(options.imported),
    temperature: 0.2,
  });
  return toGeneratedRecipe(parsed, options.imported);
}

export function toGeneratedRecipe(raw: unknown, imported: ImportedRecipeSource): GeneratedRecipe {
  return parseGeminiRecipe(raw, {
    type: imported.sourceType,
    originalUrl: imported.originalUrl,
    sourceName: imported.sourceName,
    author: imported.author,
    caption: imported.caption,
    transcript: imported.transcript,
    originalText: imported.originalText,
  });
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
