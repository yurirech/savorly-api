import { Hono } from "hono";
import { cors } from "hono/cors";
import { ZodError } from "zod";
import { z } from "zod";
import { FOOD_CATEGORIES, type GeneratedRecipe } from "@savorly/shared";
import type { Env } from "./config";
import type { Database } from "./db/client";
import { createAuthApp, requireUser } from "./auth/auth";
import { AppError } from "./errors";
import { importRecipe } from "./import/importRecipe";
import { deleteRecipe, getRecipe, saveRecipe, searchRecipes, updateRecipe } from "./recipes/recipeStore";

const importSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("instagram"), url: z.string().url() }),
  z.object({ type: z.literal("website"), url: z.string().url() }),
  z.object({ type: z.literal("text"), text: z.string().min(20), sourceName: z.string().optional() }),
]);

const generatedRecipeSchema = z.object({
  title: z.string().min(1),
  category: z.enum(FOOD_CATEGORIES),
  servings: z.number().nullable().optional(),
  prepTimeMinutes: z.number().nullable().optional(),
  cookTimeMinutes: z.number().nullable().optional(),
  ingredients: z.array(
    z.object({
      name: z.string().min(1),
      quantity: z.number().nullable().optional(),
      unit: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    }),
  ),
  steps: z.array(
    z.object({
      order: z.number(),
      text: z.string().min(1),
      durationMinutes: z.number().nullable().optional(),
      temperatureC: z.number().nullable().optional(),
    }),
  ),
  tags: z.array(z.string()),
  notes: z.string().nullable().optional(),
  uncertainties: z.array(z.string()),
  source: z.object({
    type: z.enum(["instagram", "website", "text", "manual"]),
    originalUrl: z.string().optional(),
    sourceName: z.string().optional(),
    author: z.string().optional(),
    caption: z.string().optional(),
    transcript: z.string().optional(),
    originalText: z.string().optional(),
  }),
});

export function createApp(db: Database, env: Env) {
  const app = new Hono();

  app.use("*", cors());

  app.onError((error, c) => {
    if (error instanceof ZodError) {
      return c.json(
        { error: { code: "validation_error", message: error.issues[0]?.message ?? "Invalid request." } },
        400,
      );
    }
    if (error instanceof AppError) {
      return c.json(
        {
          error: {
            code: error.code,
            message: error.message,
            offerTextPaste: error.offerTextPaste || undefined,
          },
        },
        error.status as 400,
      );
    }
    console.error(error);
    return c.json({ error: { code: "internal_error", message: "Something went wrong." } }, 500);
  });

  app.get("/health", (c) => c.json({ ok: true }));
  app.route("/auth", createAuthApp(db, env));

  app.post("/imports", async (c) => {
    await requireUser(c.req.header("authorization"), env.jwtSecret);
    const body = importSchema.parse(await c.req.json());
    const recipe = await importRecipe(body, env);
    return c.json({ recipe });
  });

  app.get("/recipes", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const q = c.req.query("q");
    const category = c.req.query("category");
    const recipes = await searchRecipes(db, user.id, {
      q,
      category: category ? generatedRecipeSchema.shape.category.parse(category) : undefined,
    });
    return c.json({ recipes });
  });

  app.post("/recipes", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const recipe = generatedRecipeSchema.parse(await c.req.json()) as GeneratedRecipe;
    const saved = await saveRecipe(db, user.id, recipe);
    return c.json({ recipe: saved }, 201);
  });

  app.get("/recipes/:id", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const recipe = await getRecipe(db, user.id, c.req.param("id"));
    return c.json({ recipe });
  });

  app.put("/recipes/:id", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const recipe = generatedRecipeSchema.parse(await c.req.json()) as GeneratedRecipe;
    const saved = await updateRecipe(db, user.id, c.req.param("id"), recipe);
    return c.json({ recipe: saved });
  });

  app.delete("/recipes/:id", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    await deleteRecipe(db, user.id, c.req.param("id"));
    return c.body(null, 204);
  });

  return app;
}
