import type { RecipeSourceImporter, ImportedRecipeSource } from "./types";
import { AppError } from "../errors";
import { fetchPublicHttpUrl } from "./ssrfFetch";
import { isCompleteRecipeJsonLd, parseRecipeWebpage } from "./parseRecipeWebpage";

export class WebsiteRecipeImporter implements RecipeSourceImporter<{ url: string }> {
  async import(input: { url: string }): Promise<ImportedRecipeSource> {
    const page = await fetchPublicHttpUrl(input.url);
    const parsed = parseRecipeWebpage(page.body, page.url);
    const jsonLd = isCompleteRecipeJsonLd(parsed.jsonLd) ? parsed.jsonLd : parsed.jsonLd;

    const jsonLdComplete = isCompleteRecipeJsonLd(parsed.jsonLd);
    const extractedText = jsonLdComplete
      ? JSON.stringify(parsed.jsonLd)
      : parsed.extractedText;

    if (!extractedText) {
      throw new AppError(
        "import_blocked",
        "This webpage had no readable recipe content. Paste the recipe text instead.",
        422,
        true,
      );
    }

    return {
      sourceType: "website",
      originalUrl: page.url,
      sourceName: parsed.sourceName,
      jsonLd: jsonLdComplete ? parsed.jsonLd : jsonLd,
      extractedText,
    };
  }
}
