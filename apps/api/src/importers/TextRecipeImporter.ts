import type { RecipeSourceImporter, ImportedRecipeSource } from "./types";
import { AppError } from "../errors";

export class TextRecipeImporter implements RecipeSourceImporter<{ text: string; sourceName?: string }> {
  async import(input: { text: string; sourceName?: string }): Promise<ImportedRecipeSource> {
    const text = input.text.trim();
    if (text.length < 20) {
      throw new AppError("validation_error", "Paste more of the recipe so it can be normalized.", 400);
    }

    return {
      sourceType: "text",
      sourceName: input.sourceName?.trim() || "Pasted text",
      originalText: text,
      extractedText: text,
    };
  }
}
