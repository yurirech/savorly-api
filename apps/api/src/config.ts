export type Env = {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  geminiApiKey?: string;
  geminiModel: string;
  apifyToken?: string;
  apifyInstagramActor: string;
  apifyYoutubeActor: string;
  apifyYoutubeLanguages: string[];
  useMockImports: boolean;
  adminPassword?: string;
  usdaFdcApiKey?: string;
};

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const databaseUrl = source.DATABASE_URL;
  const jwtSecret = source.JWT_SECRET;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required");
  }

  return {
    port: Number(source.PORT ?? 4000),
    databaseUrl,
    jwtSecret,
    geminiApiKey: source.GEMINI_API_KEY || undefined,
    geminiModel: source.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
    apifyToken: source.APIFY_TOKEN || undefined,
    apifyInstagramActor: source.APIFY_INSTAGRAM_ACTOR ?? "apify/instagram-reel-scraper",
    apifyYoutubeActor: source.APIFY_YOUTUBE_ACTOR ?? "autofacts/youtube-subtitle-transcript-scraper",
    apifyYoutubeLanguages: parseCsvList(source.APIFY_YOUTUBE_LANGUAGES, ["en", "nl"]),
    useMockImports: source.USE_MOCK_IMPORTS === "true",
    adminPassword: source.ADMIN_PASSWORD || undefined,
    usdaFdcApiKey: source.USDA_FDC_API_KEY || undefined,
  };
}

function parseCsvList(value: string | undefined, fallback: string[]): string[] {
  const parsed = (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}
