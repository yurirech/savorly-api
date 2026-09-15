export type Env = {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  geminiApiKey?: string;
  geminiModel: string;
  apifyToken?: string;
  apifyInstagramActor: string;
  useMockImports: boolean;
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
    geminiModel: source.GEMINI_MODEL ?? "gemini-2.0-flash",
    apifyToken: source.APIFY_TOKEN || undefined,
    apifyInstagramActor: source.APIFY_INSTAGRAM_ACTOR ?? "apify/instagram-reel-scraper",
    useMockImports: source.USE_MOCK_IMPORTS === "true",
  };
}
