import { describe, expect, it } from "vitest";
import type { SavedRecipe } from "@savorly/shared";
import type { Env } from "../config";
import { chatAboutRecipe, RECIPE_CHAT_INSTRUCTION } from "./recipeChat";

const env: Env = {
  port: 4000,
  databaseUrl: "postgres://savorly:savorly@localhost:5433/savorly",
  jwtSecret: "test-secret",
  geminiModel: "gemini-3.5-flash-lite",
  apifyInstagramActor: "apify/instagram-reel-scraper",
  useMockImports: true,
};

const saved: SavedRecipe = {
  id: "recipe-1",
  userId: "user-1",
  title: "Lemon cake",
  category: "cake",
  servings: 8,
  ingredients: [{ name: "flour", quantity: 200, unit: "g", notes: null }],
  steps: [{ order: 1, text: "Bake the cake." }],
  tags: [],
  notes: null,
  uncertainties: [],
  nutrition: null,
  source: { type: "manual" },
  createdAt: "2026-09-30T00:00:00.000Z",
  updatedAt: "2026-09-30T00:00:00.000Z",
};

describe("recipe chat", () => {
  it("keeps the same recipe when imports are mocked", async () => {
    const result = await chatAboutRecipe(saved, { message: "Make it healthier" }, env);
    expect(result.recipe.title).toBe("Lemon cake");
    expect(result.recipe.ingredients[0]?.name).toBe("flour");
    expect(result.reply).toBe("This stays the same recipe.");
  });

  it("tells the model to stay on this recipe", () => {
    expect(RECIPE_CHAT_INSTRUCTION).toMatch(/one existing recipe/i);
    expect(RECIPE_CHAT_INSTRUCTION).toMatch(/different dish/i);
  });
});
