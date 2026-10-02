import { and, asc, desc, eq } from "drizzle-orm";
import {
  computeNutritionRecipe,
  diaryLinesFromCookbook,
  isNutritionRecipeComplete,
  recipeServingWeightG,
  type Ingredient,
  type NutrientVector,
  type NutritionRecipeItemInput,
  type UserFood,
} from "@savorly/shared";
import type { Database } from "../db/client";
import { nutritionRecipeItems, nutritionRecipes, userFoods } from "../db/schema";
import { AppError } from "../errors";
import { getRecipe } from "../recipes/recipeStore";
import { foodFromRow, getOwnedUserFood, listUserFoods, rewriteFoodLogsFromDate } from "./nutritionStore";

export type NutritionRecipeDetail = {
  id: string;
  sourceRecipeId: string | null;
  title: string;
  servings: number;
  cookedWeightG: number | null;
  items: NutritionRecipeItemInput[];
  ingredientGramsTotal: number;
  recipeWeightG: number;
  totals: NutrientVector;
  perServing: NutrientVector;
  per100g: NutrientVector;
  complete: boolean;
  libraryFood: UserFood | null;
  updatedAt: string;
};

async function loadDetail(db: Database, userId: string, id: string): Promise<NutritionRecipeDetail> {
  const [recipe] = await db
    .select()
    .from(nutritionRecipes)
    .where(and(eq(nutritionRecipes.id, id), eq(nutritionRecipes.userId, userId)))
    .limit(1);
  if (!recipe) {
    throw new AppError("not_found", "Nutrition recipe not found.", 404);
  }
  const rows = await db
    .select({
      item: nutritionRecipeItems,
      foodName: userFoods.name,
      per100g: userFoods.per100g,
    })
    .from(nutritionRecipeItems)
    .leftJoin(userFoods, eq(userFoods.id, nutritionRecipeItems.foodId))
    .where(eq(nutritionRecipeItems.nutritionRecipeId, recipe.id))
    .orderBy(asc(nutritionRecipeItems.sortOrder));

  const items: NutritionRecipeItemInput[] = rows.map((row) => ({
    id: row.item.id,
    sourceLine: row.item.sourceLine,
    foodId: row.item.foodId,
    foodName: row.foodName,
    grams: row.item.grams,
    per100g: row.per100g as NutrientVector | null,
  }));
  const computed = computeNutritionRecipe({
    servings: recipe.servings,
    cookedWeightG: recipe.cookedWeightG,
    items,
  });
  const [library] = await db
    .select()
    .from(userFoods)
    .where(and(eq(userFoods.userId, userId), eq(userFoods.nutritionRecipeId, recipe.id)))
    .limit(1);
  return {
    id: recipe.id,
    sourceRecipeId: recipe.sourceRecipeId,
    title: recipe.title,
    servings: recipe.servings,
    cookedWeightG: recipe.cookedWeightG,
    items,
    ...computed,
    libraryFood: library ? foodFromRow(library) : null,
    updatedAt: recipe.updatedAt.toISOString(),
  };
}

async function touch(db: Database, id: string) {
  await db.update(nutritionRecipes).set({ updatedAt: new Date() }).where(eq(nutritionRecipes.id, id));
}

async function syncPublishedRecipe(db: Database, userId: string, recipeId: string, fromDate?: string) {
  const detail = await loadDetail(db, userId, recipeId);
  if (!detail.libraryFood || !isNutritionRecipeComplete(detail)) return detail;
  await db
    .update(userFoods)
    .set({
      name: detail.title,
      per100g: detail.per100g,
      servingWeightG: recipeServingWeightG(detail.recipeWeightG, detail.servings),
      updatedAt: new Date(),
    })
    .where(eq(userFoods.id, detail.libraryFood.id));
  if (fromDate) {
    await rewriteFoodLogsFromDate(db, userId, detail.libraryFood.id, detail.per100g, fromDate);
  }
  return loadDetail(db, userId, recipeId);
}

export async function listNutritionRecipesForSource(db: Database, userId: string, sourceRecipeId: string) {
  const rows = await db
    .select()
    .from(nutritionRecipes)
    .where(and(eq(nutritionRecipes.userId, userId), eq(nutritionRecipes.sourceRecipeId, sourceRecipeId)))
    .orderBy(desc(nutritionRecipes.updatedAt));
  const foods = await db
    .select()
    .from(userFoods)
    .where(
      and(
        eq(userFoods.userId, userId),
        eq(userFoods.source, "recipe"),
      ),
    );
  const linked = foods
    .filter((food) => rows.some((row) => row.id === food.nutritionRecipeId))
    .map(foodFromRow)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return { recipes: rows.map((row) => ({ id: row.id, title: row.title, updatedAt: row.updatedAt.toISOString() })), foods: linked };
}

export async function getNutritionRecipe(db: Database, userId: string, id: string) {
  return loadDetail(db, userId, id);
}

export async function createNutritionRecipe(db: Database, userId: string, title: string, id?: string) {
  const name = title.trim();
  if (!name) {
    throw new AppError("validation_error", "Give the recipe a name.", 400);
  }
  if (id) {
    await db
      .insert(nutritionRecipes)
      .values({
        id,
        userId,
        sourceRecipeId: null,
        title: name,
        servings: 1,
      })
      .onConflictDoNothing();
    return loadDetail(db, userId, id);
  }
  const [created] = await db
    .insert(nutritionRecipes)
    .values({
      userId,
      sourceRecipeId: null,
      title: name,
      servings: 1,
    })
    .returning();
  if (!created) {
    throw new AppError("internal_error", "Could not create recipe.", 500);
  }
  return loadDetail(db, userId, created.id);
}

export async function createNutritionRecipeFromCookbook(db: Database, userId: string, recipeId: string) {
  const cookbook = await getRecipe(db, userId, recipeId);
  const foods = await listUserFoods(db, userId);
  const [created] = await db
    .insert(nutritionRecipes)
    .values({
      userId,
      sourceRecipeId: cookbook.id,
      title: cookbook.title,
      servings: cookbook.servings && cookbook.servings > 0 ? cookbook.servings : 1,
    })
    .returning();
  if (!created) {
    throw new AppError("internal_error", "Could not copy recipe.", 500);
  }
  const lines = diaryLinesFromCookbook(cookbook.ingredients, foods);
  if (lines.length > 0) {
    await db.insert(nutritionRecipeItems).values(
      lines.map((line, index) => ({
        nutritionRecipeId: created.id,
        sourceLine: line.sourceLine,
        foodId: line.foodId,
        grams: line.grams,
        sortOrder: index,
      })),
    );
  }
  return loadDetail(db, userId, created.id);
}

export async function createNutritionRecipeFromIngredients(
  db: Database,
  userId: string,
  input: { title: string; servings: number; ingredients: Ingredient[] },
) {
  const foods = await listUserFoods(db, userId);
  const title = input.title.trim().slice(0, 120) || "Recipe";
  const servings = Number.isInteger(input.servings) && input.servings >= 1 ? input.servings : 1;
  const [created] = await db
    .insert(nutritionRecipes)
    .values({
      userId,
      sourceRecipeId: null,
      title,
      servings,
    })
    .returning();
  if (!created) {
    throw new AppError("internal_error", "Could not create recipe.", 500);
  }
  const lines = diaryLinesFromCookbook(input.ingredients, foods);
  if (lines.length > 0) {
    await db.insert(nutritionRecipeItems).values(
      lines.map((line, index) => ({
        nutritionRecipeId: created.id,
        sourceLine: line.sourceLine.slice(0, 200),
        foodId: line.foodId,
        grams: line.grams,
        sortOrder: index,
      })),
    );
  }
  return loadDetail(db, userId, created.id);
}

export async function updateNutritionRecipe(
  db: Database,
  userId: string,
  id: string,
  input: { title?: string; servings?: number; cookedWeightG?: number | null; sourceRecipeId?: string | null },
  fromDate?: string,
) {
  await loadDetail(db, userId, id);
  const patch: {
    title?: string;
    servings?: number;
    cookedWeightG?: number | null;
    sourceRecipeId?: string | null;
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };
  if (input.title != null) {
    const title = input.title.trim();
    if (!title) {
      throw new AppError("validation_error", "Give the recipe a name.", 400);
    }
    patch.title = title;
  }
  if (input.servings != null) {
    if (!Number.isInteger(input.servings) || input.servings < 1) {
      throw new AppError("validation_error", "Servings must be at least 1.", 400);
    }
    patch.servings = input.servings;
  }
  if (input.cookedWeightG !== undefined) {
    if (input.cookedWeightG != null && !(input.cookedWeightG > 0)) {
      throw new AppError("validation_error", "Cooked weight must be greater than 0.", 400);
    }
    patch.cookedWeightG = input.cookedWeightG;
  }
  if (input.sourceRecipeId !== undefined) {
    if (input.sourceRecipeId == null) {
      patch.sourceRecipeId = null;
    } else {
      await getRecipe(db, userId, input.sourceRecipeId);
      patch.sourceRecipeId = input.sourceRecipeId;
    }
  }
  await db.update(nutritionRecipes).set(patch).where(eq(nutritionRecipes.id, id));
  return syncPublishedRecipe(db, userId, id, fromDate);
}

export async function updateNutritionRecipeItem(
  db: Database,
  userId: string,
  recipeId: string,
  itemId: string,
  input: { foodId?: string | null; grams?: number | null },
  fromDate?: string,
) {
  await loadDetail(db, userId, recipeId);
  if (input.foodId) {
    const food = await getOwnedUserFood(db, userId, input.foodId);
    if (food.source === "recipe") {
      throw new AppError("validation_error", "Pick a food, not another recipe card.", 400);
    }
  }
  if (input.grams != null && !(input.grams > 0)) {
    throw new AppError("validation_error", "Grams must be greater than 0.", 400);
  }
  const [row] = await db
    .update(nutritionRecipeItems)
    .set({
      ...(input.foodId !== undefined ? { foodId: input.foodId } : {}),
      ...(input.grams !== undefined ? { grams: input.grams } : {}),
    })
    .where(and(eq(nutritionRecipeItems.id, itemId), eq(nutritionRecipeItems.nutritionRecipeId, recipeId)))
    .returning();
  if (!row) {
    throw new AppError("not_found", "Ingredient line not found.", 404);
  }
  await touch(db, recipeId);
  return syncPublishedRecipe(db, userId, recipeId, fromDate);
}

export async function addNutritionRecipeItem(
  db: Database,
  userId: string,
  recipeId: string,
  input: { foodId: string; grams: number; sourceLine?: string },
  fromDate?: string,
) {
  await loadDetail(db, userId, recipeId);
  const food = await getOwnedUserFood(db, userId, input.foodId);
  if (food.source === "recipe" || !(input.grams > 0)) {
    throw new AppError("validation_error", "Add a food and grams greater than 0.", 400);
  }
  const [maxOrder] = await db
    .select({ value: nutritionRecipeItems.sortOrder })
    .from(nutritionRecipeItems)
    .where(eq(nutritionRecipeItems.nutritionRecipeId, recipeId))
    .orderBy(desc(nutritionRecipeItems.sortOrder))
    .limit(1);
  await db.insert(nutritionRecipeItems).values({
    nutritionRecipeId: recipeId,
    sourceLine: input.sourceLine?.trim() || food.name,
    foodId: food.id,
    grams: input.grams,
    sortOrder: (maxOrder?.value ?? -1) + 1,
  });
  await touch(db, recipeId);
  return syncPublishedRecipe(db, userId, recipeId, fromDate);
}

export async function deleteNutritionRecipeItem(
  db: Database,
  userId: string,
  recipeId: string,
  itemId: string,
  fromDate?: string,
) {
  await loadDetail(db, userId, recipeId);
  const [row] = await db
    .delete(nutritionRecipeItems)
    .where(and(eq(nutritionRecipeItems.id, itemId), eq(nutritionRecipeItems.nutritionRecipeId, recipeId)))
    .returning();
  if (!row) {
    throw new AppError("not_found", "Ingredient line not found.", 404);
  }
  await touch(db, recipeId);
  return syncPublishedRecipe(db, userId, recipeId, fromDate);
}

export async function publishNutritionRecipe(db: Database, userId: string, id: string, fromDate?: string) {
  const detail = await loadDetail(db, userId, id);
  if (!isNutritionRecipeComplete(detail)) {
    throw new AppError(
      "validation_error",
      "Match every ingredient to a food or delete the line before saving.",
      400,
    );
  }
  const [existing] = await db
    .select()
    .from(userFoods)
    .where(and(eq(userFoods.userId, userId), eq(userFoods.nutritionRecipeId, id)))
    .limit(1);
  if (existing) {
    await db
      .update(userFoods)
      .set({
        name: detail.title,
        per100g: detail.per100g,
        servingWeightG: recipeServingWeightG(detail.recipeWeightG, detail.servings),
        updatedAt: new Date(),
      })
      .where(eq(userFoods.id, existing.id));
  } else {
    await db.insert(userFoods).values({
      userId,
      name: detail.title,
      originalName: detail.title,
      source: "recipe",
      fdcId: null,
      nevoCode: null,
      nutritionRecipeId: id,
      servingWeightG: recipeServingWeightG(detail.recipeWeightG, detail.servings),
      per100g: detail.per100g,
    });
  }
  await touch(db, id);
  return syncPublishedRecipe(db, userId, id, fromDate);
}

export async function deleteNutritionRecipe(db: Database, userId: string, id: string) {
  const detail = await loadDetail(db, userId, id);
  if (detail.libraryFood) {
    const { deleteUserFood } = await import("./nutritionStore");
    await deleteUserFood(db, userId, detail.libraryFood.id);
  }
  await db.delete(nutritionRecipes).where(and(eq(nutritionRecipes.id, id), eq(nutritionRecipes.userId, userId)));
}
