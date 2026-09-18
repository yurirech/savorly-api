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

  it("returns a Chef fixture with servings, steps, and per-serving macros", async () => {
    const recipe = await generateRecipe(
      {
        agent: "chef",
        mealType: "main",
        servings: 2,
        style: "regular",
        notes: "creamy mushroom pasta",
      },
      env,
    );
    expect(recipe.source.sourceName).toBe("Chef");
    expect(recipe.servings).toBe(2);
    expect(recipe.steps.length).toBeGreaterThan(0);
    expect(recipe.nutrition).toEqual({
      servingG: 450,
      perServing: { kcal: 810, proteinG: 36, carbsG: 99, fatG: 27 },
    });
    expect(recipe.nutrition?.perPint).toBeUndefined();
  });

  it("returns a Bread fixture with a chosen program in step 1 and keeps steps", async () => {
    const recipe = await generateRecipe(
      {
        agent: "bread",
        size: "large",
        style: "regular",
        notes: "honey oat",
      },
      env,
    );
    expect(recipe.source.sourceName).toBe("Bread");
    expect(recipe.servings).toBe(16);
    expect(recipe.steps[0]?.text).toContain("Basic");
    expect(recipe.steps[0]?.text).toContain("Large (1000 g)");
    expect(recipe.nutrition?.servingG).toBe(40);
    expect(recipe.nutrition?.perPint).toBeUndefined();
  });

  it("returns a Bake fixture with oven steps and per-serving macros", async () => {
    const recipe = await generateRecipe(
      {
        agent: "bake",
        kind: "muffin",
        style: "regular",
        notes: "blueberry",
      },
      env,
    );
    expect(recipe.source.sourceName).toBe("Bake");
    expect(recipe.servings).toBe(12);
    expect(recipe.steps.length).toBeGreaterThan(0);
    expect(recipe.steps[1]?.text.toLowerCase()).toContain("muffin");
    expect(recipe.nutrition?.servingG).toBe(70);
    expect(recipe.nutrition?.perPint).toBeUndefined();
  });
});
