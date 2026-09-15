import { describe, expect, it } from "vitest";
import { importRecipe } from "../import/importRecipe";
import type { Env } from "../config";

const env: Env = {
  port: 4000,
  databaseUrl: "postgres://savorly:savorly@localhost:5433/savorly",
  jwtSecret: "test-secret",
  geminiModel: "gemini-2.0-flash",
  apifyInstagramActor: "apify/instagram-reel-scraper",
  useMockImports: true,
};

describe("mocked imports", () => {
  it("returns the same GeneratedRecipe shape for all three sources", async () => {
    const instagram = await importRecipe({ type: "instagram", url: "https://www.instagram.com/reel/x/" }, env);
    const website = await importRecipe({ type: "website", url: "https://example.com/recipe" }, env);
    const text = await importRecipe({ type: "text", text: "A long enough pasted recipe for pancakes this weekend." }, env);

    for (const recipe of [instagram, website, text]) {
      expect(recipe.title).toBeTruthy();
      expect(recipe.category).toBeTruthy();
      expect(Array.isArray(recipe.ingredients)).toBe(true);
      expect(Array.isArray(recipe.steps)).toBe(true);
      expect(Array.isArray(recipe.uncertainties)).toBe(true);
      expect(recipe.source.type).toMatch(/instagram|website|text/);
    }
  });
});
