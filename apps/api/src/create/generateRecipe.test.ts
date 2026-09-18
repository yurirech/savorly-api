import { describe, expect, it } from "vitest";
import { generateRecipe } from "./generateRecipe";
import type { Env } from "../config";

const env: Env = {
  port: 4000,
  databaseUrl: "postgres://savorly:savorly@localhost:5433/savorly",
  jwtSecret: "test-secret",
  geminiModel: "gemini-3.5-flash-lite",
  apifyInstagramActor: "apify/instagram-reel-scraper",
  useMockImports: true,
};

describe("mocked create generations", () => {
  it("returns a Creami fixture and marks adapt in the title", async () => {
    const first = await generateRecipe(
      {
        agent: "creami",
        size: "small",
        macros: "lean",
        texture: "gelato",
        sweetenerKind: "lightweight",
        flavor: "strawberry",
      },
      env,
    );
    expect(first.source.type).toBe("manual");
    expect(first.source.sourceName).toBe("Creami");
    expect(first.title.toLowerCase()).toContain("strawberry");
    expect(first.nutrition?.perServing.kcal).toBeGreaterThan(0);
    expect(first.steps).toEqual([]);
    expect(first.ingredients.some((ingredient) => ingredient.notes === "mix-in")).toBe(true);
    expect(first.ingredients.some((ingredient) => ingredient.name === "stevia")).toBe(true);
    expect(first.ingredients.some((ingredient) => ingredient.name === "refined sugar" && ingredient.quantity === 15)).toBe(true);

    const adapted = await generateRecipe(
      {
        agent: "creami",
        size: "small",
        macros: "lean",
        texture: "gelato",
        sweetenerKind: "lightweight",
        flavor: "strawberry",
        previousRecipe: first,
        adaptNote: "I don't have strawberry powder",
      },
      env,
    );
    expect(adapted.title).toContain("adapted");
    expect(adapted.notes).toContain("strawberry powder");
  });
});
