import { Hono } from "hono";
import { cors } from "hono/cors";
import { ZodError } from "zod";
import { z } from "zod";
import { FOOD_CATEGORIES, type GeneratedRecipe, type RecipeGenerateRequest } from "@savorly/shared";
import type { Env } from "./config";
import type { Database } from "./db/client";
import { createAuthApp, requireUser } from "./auth/auth";
import { AppError } from "./errors";
import { generateRecipe } from "./create/generateRecipe";
import { importRecipe } from "./import/importRecipe";
import { deleteRecipe, getRecipe, saveRecipe, searchRecipes, updateRecipe } from "./recipes/recipeStore";
import {
  addRecipesToCookbook,
  createCookbook,
  deleteCookbook,
  getCookbook,
  listCookbookIdsForRecipe,
  listCookbooks,
  removeRecipeFromCookbook,
  renameCookbook,
  setRecipeCookbooks,
} from "./cookbooks/cookbookStore";

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
      canonicalKey: z.string().nullable().optional(),
      gramsPerCup: z.number().nullable().optional(),
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
  nutrition: z
    .object({
      servingG: z.number(),
      perServing: z.object({
        kcal: z.number(),
        proteinG: z.number(),
        carbsG: z.number(),
        fatG: z.number(),
      }),
      perPint: z.object({
        kcal: z.number(),
        proteinG: z.number(),
        carbsG: z.number(),
        fatG: z.number(),
      }),
    })
    .nullable()
    .optional(),
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

const generateSchema = z
  .discriminatedUnion("agent", [
    z.object({
      agent: z.literal("creami"),
      size: z.enum(["big", "small"]),
      macros: z.enum(["lean", "balanced"]),
      texture: z.enum(["gelato", "standard"]),
      sweetener: z.enum(["stevia", "xylitol", "blend"]),
      flavor: z.string().trim().optional(),
      notes: z.string().trim().optional(),
      previousRecipe: generatedRecipeSchema.optional(),
      adaptNote: z.string().trim().min(1).optional(),
    }),
    z.object({
      agent: z.enum(["bread", "bake", "chef"]),
      notes: z.string(),
      previousRecipe: generatedRecipeSchema.optional(),
      adaptNote: z.string().trim().min(1).optional(),
    }),
  ])
  .superRefine((value, ctx) => {
    if (value.adaptNote && !value.previousRecipe) {
      ctx.addIssue({
        code: "custom",
        message: "Adapt needs the current recipe.",
        path: ["previousRecipe"],
      });
    }
  });

const cookbookNameSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

const recipeIdsSchema = z.object({
  recipeIds: z.array(z.string().uuid()).min(1),
});

const cookbookIdsSchema = z.object({
  cookbookIds: z.array(z.string().uuid()),
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
    const recipe = await importRecipe(body, env, db);
    return c.json({ recipe });
  });

  app.post("/generations", async (c) => {
    await requireUser(c.req.header("authorization"), env.jwtSecret);
    const body = generateSchema.parse(await c.req.json());
    const recipe = await generateRecipe(body as RecipeGenerateRequest, env, db);
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

  app.get("/recipes/:id/cookbooks", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const cookbookIds = await listCookbookIdsForRecipe(db, user.id, c.req.param("id"));
    return c.json({ cookbookIds });
  });

  app.put("/recipes/:id/cookbooks", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const body = cookbookIdsSchema.parse(await c.req.json());
    const cookbookIds = await setRecipeCookbooks(db, user.id, c.req.param("id"), body.cookbookIds);
    return c.json({ cookbookIds });
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

  app.get("/cookbooks", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const cookbooks = await listCookbooks(db, user.id);
    return c.json({ cookbooks });
  });

  app.post("/cookbooks", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const body = cookbookNameSchema.parse(await c.req.json());
    const cookbook = await createCookbook(db, user.id, body.name);
    return c.json({ cookbook }, 201);
  });

  app.get("/cookbooks/:id", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const cookbook = await getCookbook(db, user.id, c.req.param("id"));
    return c.json({ cookbook });
  });

  app.patch("/cookbooks/:id", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const body = cookbookNameSchema.parse(await c.req.json());
    const cookbook = await renameCookbook(db, user.id, c.req.param("id"), body.name);
    return c.json({ cookbook });
  });

  app.delete("/cookbooks/:id", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    await deleteCookbook(db, user.id, c.req.param("id"));
    return c.body(null, 204);
  });

  app.post("/cookbooks/:id/recipes", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const body = recipeIdsSchema.parse(await c.req.json());
    const cookbook = await addRecipesToCookbook(db, user.id, c.req.param("id"), body.recipeIds);
    return c.json({ cookbook });
  });

  app.delete("/cookbooks/:id/recipes/:recipeId", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    await removeRecipeFromCookbook(db, user.id, c.req.param("id"), c.req.param("recipeId"));
    return c.body(null, 204);
  });

  return app;
}
