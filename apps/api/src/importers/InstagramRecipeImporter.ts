import { ApifyClient } from "apify-client";
import type { RecipeSourceImporter, ImportedRecipeSource } from "./types";
import { AppError } from "../errors";
import { parsePublicHttpUrl } from "./ssrfFetch";

type ApifyReelItem = {
  caption?: string;
  text?: string;
  ownerUsername?: string;
  ownerFullName?: string;
  transcript?: string;
  videoTranscript?: string;
  subtitles?: string;
};

export class InstagramRecipeImporter implements RecipeSourceImporter<{ url: string }> {
  constructor(
    private readonly token: string,
    private readonly actorId: string,
  ) {}

  async import(input: { url: string }): Promise<ImportedRecipeSource> {
    const url = parsePublicHttpUrl(input.url);
    if (!isInstagramUrl(url)) {
      throw new AppError("validation_error", "Enter a public Instagram Reel URL.", 400);
    }

    const client = new ApifyClient({ token: this.token });
    const run = await client.actor(this.actorId).call({
      directUrls: [url.href],
      resultsLimit: 1,
    });

    if (!run?.defaultDatasetId) {
      throw new AppError(
        "import_blocked",
        "Instagram did not return caption data. Paste the recipe text instead.",
        422,
        true,
      );
    }

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const item = (items[0] ?? {}) as ApifyReelItem;
    const caption = item.caption ?? item.text ?? "";
    const transcript = item.transcript ?? item.videoTranscript ?? item.subtitles ?? "";
    const extractedText = [caption, transcript].filter(Boolean).join("\n\n");

    if (!extractedText) {
      throw new AppError(
        "import_blocked",
        "This Reel has no caption or transcript. Paste the recipe text instead.",
        422,
        true,
      );
    }

    return {
      sourceType: "instagram",
      originalUrl: url.href,
      sourceName: "Instagram",
      author: item.ownerFullName || item.ownerUsername,
      caption: caption || undefined,
      transcript: transcript || undefined,
      extractedText,
    };
  }
}

function isInstagramUrl(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  return host === "instagram.com" || host === "instagr.am";
}
