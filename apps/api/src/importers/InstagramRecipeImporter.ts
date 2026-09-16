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
    if (!isInstagramReelUrl(url)) {
      throw new AppError("validation_error", "Enter a public Instagram Reel URL.", 400);
    }

    const client = new ApifyClient({ token: this.token });
    let run;
    try {
      run = await client.actor(this.actorId).call(instagramReelActorInput(url));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "import_blocked",
        "Could not read this Reel. Use a public Reel URL or paste the recipe text instead.",
        502,
        true,
      );
    }

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

export function instagramReelActorInput(url: URL) {
  return {
    username: [url.href],
    resultsLimit: 1,
  };
}

function isInstagramReelUrl(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "instagram.com" && host !== "instagr.am") {
    return false;
  }
  return /\/(reel|reels|p)\//i.test(url.pathname);
}
