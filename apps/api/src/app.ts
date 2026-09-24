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
import {
  createPantryItem,
  deletePantryItem,
  getPantry,
  setStarterInPantry,
  updatePantryItem,
} from "./pantry/pantryStore";
import { parseMealSuggestionExcludeIds, suggestMeal } from "./pantry/suggestMeals";
import { suggestPantrySubstitutions } from "./pantry/suggestPantrySubstitutions";
import {
  addDiaryEntry,
  addQuickDiaryEntry,
  createDiaryMeal,
  createManualFood,
  deleteDiaryEntry,
  deleteDiaryMeal,
  deleteUserFood,
  getDiaryDay,
  getFrequentGramsForFood,
  getNutritionProfile,
  importUsdaFood,
  importNevoFood,
  getOwnedUserFood,
  listUserFoods,
  updateDiaryEntry,
  updateDiaryMeal,
  upsertNutritionProfile,
} from "./nutrition/nutritionStore";
import { requireNevoFood, searchNevoFoods, nevoFoodsReady } from "./nutrition/nevoStore";
import { fetchUsdaFood, searchUsdaFoods } from "./nutrition/usdaClient";
import { NEVO_ATTRIBUTION } from "@savorly/shared";

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
      perPint: z
        .object({
          kcal: z.number(),
          proteinG: z.number(),
          carbsG: z.number(),
          fatG: z.number(),
        })
        .nullable()
        .optional(),
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
      sweetenerKind: z.enum(["bulky", "lightweight"]),
      sweetenerName: z.string().trim().optional(),
      flavor: z.string().trim().optional(),
      notes: z.string().trim().optional(),
      previousRecipe: generatedRecipeSchema.optional(),
      adaptNote: z.string().trim().min(1).optional(),
      adaptGoal: z.string().trim().min(1).optional(),
    }),
    z.object({
      agent: z.literal("bread"),
      size: z.enum(["medium", "large"]),
      style: z.enum(["regular", "lighter"]),
      notes: z.string().trim().optional(),
      previousRecipe: generatedRecipeSchema.optional(),
      adaptNote: z.string().trim().min(1).optional(),
      adaptGoal: z.string().trim().min(1).optional(),
    }),
    z.object({
      agent: z.literal("bake"),
      kind: z.enum(["cake", "muffin", "cupcake", "other"]),
      style: z.enum(["regular", "lighter"]),
      notes: z.string().trim().optional(),
      previousRecipe: generatedRecipeSchema.optional(),
      adaptNote: z.string().trim().min(1).optional(),
      adaptGoal: z.string().trim().min(1).optional(),
    }),
    z.object({
      agent: z.literal("chef"),
      mealType: z.enum(["main", "side", "snack"]),
      servings: z.union([z.literal(1), z.literal(2), z.literal(4)]),
      style: z.enum(["regular", "lighter", "nutritious"]),
      notes: z.string().trim().optional(),
      previousRecipe: generatedRecipeSchema.optional(),
      adaptNote: z.string().trim().min(1).optional(),
      adaptGoal: z.string().trim().min(1).optional(),
    }),
  ])
  .superRefine((value, ctx) => {
    const hasAdaptText = Boolean(value.adaptNote?.trim() || value.adaptGoal?.trim());
    if (hasAdaptText && !value.previousRecipe) {
      ctx.addIssue({
        code: "custom",
        message: "Adapt needs the current recipe.",
        path: ["previousRecipe"],
      });
    }
    if (value.previousRecipe && !hasAdaptText) {
      ctx.addIssue({
        code: "custom",
        message: "Adapt needs a change or goal.",
        path: ["adaptNote"],
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

const pantryStarterSchema = z.object({
  inPantry: z.boolean(),
});

const pantryItemCreateSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  aliases: z.array(z.string().trim().min(1).max(80)).max(32).optional(),
});

const pantryItemUpdateSchema = pantryItemCreateSchema;

const mealSuggestionQuerySchema = z.object({
  category: z.enum(FOOD_CATEGORIES).optional(),
  exclude: z.string().optional(),
});

const pantrySubstitutionsBodySchema = z.object({
  displayServings: z.number().int().positive().optional(),
});

const nutrientVectorSchema = z.object({
  kcal: z.number().finite().nonnegative(),
  proteinG: z.number().finite().nonnegative(),
  carbsG: z.number().finite().nonnegative(),
  fatG: z.number().finite().nonnegative(),
  fiberG: z.number().finite().nonnegative().nullable().optional(),
  sodiumMg: z.number().finite().nonnegative().nullable().optional(),
  saturatedFatG: z.number().finite().nonnegative().nullable().optional(),
  ironMg: z.number().finite().nonnegative().nullable().optional(),
  calciumMg: z.number().finite().nonnegative().nullable().optional(),
  vitaminDMcg: z.number().finite().nonnegative().nullable().optional(),
});

const nutritionProfileSchema = z.object({
  sex: z.enum(["male", "female"]),
  age: z.number().int().min(14).max(100),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(30).max(400),
  activity: z.enum(["sedentary", "light", "moderate", "active"]),
  goal: z.enum(["lose", "maintain", "gain"]),
  weeklyKgChange: z.number().min(0).max(2),
});

const manualFoodSchema = z.object({
  name: z.string().trim().min(1).max(80),
  per100g: nutrientVectorSchema,
});

const importFoodSchema = z.object({
  fdcId: z.number().int().positive(),
  name: z.string().trim().min(1).max(80).optional(),
});

const importNevoFoodSchema = z.object({
  nevoCode: z.number().int().positive(),
  name: z.string().trim().min(1).max(120).optional(),
});

const diaryEntrySchema = z.object({
  mealId: z.string().uuid(),
  foodId: z.string().uuid(),
  grams: z.number().positive().max(5000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const diaryEntryPatchSchema = z.object({
  grams: z.number().positive().max(5000),
});

const quickDiaryEntrySchema = z.object({
  mealId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().trim().max(80).optional(),
  kcal: z.number().finite().nonnegative(),
  proteinG: z.number().finite().nonnegative().optional(),
  carbsG: z.number().finite().nonnegative().optional(),
  fatG: z.number().finite().nonnegative().optional(),
});

const quickDiaryEntryPatchSchema = z.object({
  label: z.string().trim().max(80).optional(),
  kcal: z.number().finite().nonnegative(),
  proteinG: z.number().finite().nonnegative().optional(),
  carbsG: z.number().finite().nonnegative().optional(),
  fatG: z.number().finite().nonnegative().optional(),
});

const diaryMealSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(1).max(40),
});

const diaryMealPatchSchema = z
  .object({
    name: z.string().min(1).max(40).optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine((value) => value.name != null || value.sortOrder != null, {
    message: "Provide a name or sort order to update.",
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
    const result = await generateRecipe(body as RecipeGenerateRequest, env, db);
    return c.json(result);
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

  app.post("/recipes/:id/pantry-substitutions", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const body = pantrySubstitutionsBodySchema.parse(await c.req.json().catch(() => ({})));
    const result = await suggestPantrySubstitutions(db, user.id, c.req.param("id"), body, env);
    return c.json(result);
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

  app.get("/pantry", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const pantry = await getPantry(db, user.id);
    return c.json(pantry);
  });

  app.put("/pantry/starters/:starterKey", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const body = pantryStarterSchema.parse(await c.req.json());
    const pantry = await setStarterInPantry(db, user.id, c.req.param("starterKey"), body.inPantry);
    return c.json(pantry);
  });

  app.post("/pantry/items", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const body = pantryItemCreateSchema.parse(await c.req.json());
    const item = await createPantryItem(db, user.id, body.displayName, body.aliases ?? []);
    return c.json({ item }, 201);
  });

  app.patch("/pantry/items/:id", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const body = pantryItemUpdateSchema.parse(await c.req.json());
    const item = await updatePantryItem(db, user.id, c.req.param("id"), body.displayName, body.aliases ?? []);
    return c.json({ item });
  });

  app.delete("/pantry/items/:id", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    await deletePantryItem(db, user.id, c.req.param("id"));
    return c.body(null, 204);
  });

  app.get("/pantry/meal-suggestions", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const query = mealSuggestionQuerySchema.parse({
      category: c.req.query("category") || undefined,
      exclude: c.req.query("exclude") || undefined,
    });
    const result = await suggestMeal(db, user.id, {
      category: query.category,
      excludeRecipeIds: parseMealSuggestionExcludeIds(query.exclude),
    });
    return c.json(result);
  });

  app.get("/nutrition/profile", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    return c.json(await getNutritionProfile(db, user.id));
  });

  app.put("/nutrition/profile", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const body = nutritionProfileSchema.parse(await c.req.json());
    return c.json(await upsertNutritionProfile(db, user.id, body));
  });

  app.get("/nutrition/foods", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const foods = await listUserFoods(db, user.id, c.req.query("q"));
    return c.json({ foods });
  });

  app.get("/nutrition/foods/usda", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    void user;
    const hits = await searchUsdaFoods(c.req.query("q") ?? "", env);
    return c.json({ foods: hits });
  });

  app.get("/nutrition/foods/nevo", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    void user;
    if (!(await nevoFoodsReady(db))) {
      throw new AppError(
        "internal_error",
        "NEVO reference data is not loaded on this server yet.",
        503,
      );
    }
    const hits = await searchNevoFoods(db, c.req.query("q") ?? "");
    return c.json({ foods: hits, attribution: NEVO_ATTRIBUTION });
  });

  app.get("/nutrition/foods/:id/frequent-grams", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const grams = await getFrequentGramsForFood(db, user.id, c.req.param("id"));
    return c.json({ grams });
  });

  app.get("/nutrition/foods/:id", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const food = await getOwnedUserFood(db, user.id, c.req.param("id"));
    return c.json({
      food,
      attribution: food.source === "nevo" ? NEVO_ATTRIBUTION : undefined,
    });
  });

  app.post("/nutrition/foods", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const body = manualFoodSchema.parse(await c.req.json());
    const food = await createManualFood(db, user.id, body.name, body.per100g);
    return c.json({ food }, 201);
  });

  app.post("/nutrition/foods/import", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const body = importFoodSchema.parse(await c.req.json());
    const imported = await fetchUsdaFood(body.fdcId, env, body.name);
    const food = await importUsdaFood(db, user.id, imported);
    return c.json({ food }, 201);
  });

  app.post("/nutrition/foods/import/nevo", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const body = importNevoFoodSchema.parse(await c.req.json());
    const reference = await requireNevoFood(db, body.nevoCode);
    const food = await importNevoFood(db, user.id, {
      nevoCode: reference.nevoCode,
      name: body.name ?? reference.nameNl,
      per100g: reference.per100g,
    });
    return c.json({ food, attribution: NEVO_ATTRIBUTION }, 201);
  });

  app.delete("/nutrition/foods/:id", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    await deleteUserFood(db, user.id, c.req.param("id"));
    return c.body(null, 204);
  });

  app.get("/nutrition/diary", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const date = c.req.query("date");
    if (!date) {
      return c.json({ error: { code: "validation_error", message: "Date is required." } }, 400);
    }
    return c.json(await getDiaryDay(db, user.id, date));
  });

  app.post("/nutrition/diary", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const body = diaryEntrySchema.parse(await c.req.json());
    return c.json(await addDiaryEntry(db, user.id, body), 201);
  });

  app.post("/nutrition/diary/quick", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const body = quickDiaryEntrySchema.parse(await c.req.json());
    return c.json(await addQuickDiaryEntry(db, user.id, body), 201);
  });

  app.patch("/nutrition/diary/:id", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const raw = await c.req.json();
    if (raw && typeof raw === "object" && "grams" in raw) {
      diaryEntryPatchSchema.parse(raw);
    } else {
      quickDiaryEntryPatchSchema.parse(raw);
    }
    return c.json(await updateDiaryEntry(db, user.id, c.req.param("id"), raw));
  });

  app.delete("/nutrition/diary/:id", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    return c.json(await deleteDiaryEntry(db, user.id, c.req.param("id")));
  });

  app.post("/nutrition/diary/meals", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const body = diaryMealSchema.parse(await c.req.json());
    return c.json(await createDiaryMeal(db, user.id, body), 201);
  });

  app.patch("/nutrition/diary/meals/:id", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    const body = diaryMealPatchSchema.parse(await c.req.json());
    return c.json(await updateDiaryMeal(db, user.id, c.req.param("id"), body));
  });

  app.delete("/nutrition/diary/meals/:id", async (c) => {
    const user = await requireUser(c.req.header("authorization"), env.jwtSecret);
    return c.json(await deleteDiaryMeal(db, user.id, c.req.param("id")));
  });

  return app;
}
