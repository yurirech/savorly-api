import { and, asc, desc, eq } from "drizzle-orm";
import {
  computeNutritionRecipe,
  isIngredientSection,
  isNutritionRecipeComplete,
  normalizeUnit,
  quantityToGrams,
  type Ingredient,
  type NutrientVector,
  type NutritionRecipeItemInput,
  type UserFood,
} from "@savorly/shared";
import type { Database } from "../db/client";
import { nutritionRecipeItems, nutritionRecipes, userFoods } from "../db/schema";
import { AppError } from "../errors";
import { getRecipe } from "../recipes/recipeStore";
import { foodFromRow, getOwnedUserFood, listUserFoods } from "./nutritionStore";

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

function lineGrams(ingredient: Ingredient): number | null {
  const quantity = ingredient.quantity;
  if (quantity == null || !(quantity > 0)) {
    return null;
  }
  const unit = (ingredient.unit ?? "").trim().toLowerCase();
  if (unit === "kg" || unit === "kilogram" || unit === "kilograms") {
    return quantity * 1000;
  }
  const normalized = normalizeUnit(ingredient.unit);
  if (normalized === "g") {
    return quantity;
  }
  if (normalized && ingredient.gramsPerCup && ingredient.gramsPerCup > 0) {
    return quantityToGrams(quantity, normalized, ingredient.gramsPerCup);
  }
  return null;
}

function matchFoodId(name: string, foods: UserFood[]): string | null {
  const needle = name.trim().toLowerCase();
  if (!needle) {
    return null;
  }
  const hits = foods.filter((food) => food.name.trim().toLowerCase() === needle && food.source !== "recipe");
  return hits.length === 1 ? hits[0]!.id : null;
}

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
  const lines = cookbook.ingredients.filter((line) => !isIngredientSection(line));
  if (lines.length > 0) {
    await db.insert(nutritionRecipeItems).values(
      lines.map((line, index) => ({
        nutritionRecipeId: created.id,
        sourceLine: line.name,
        foodId: matchFoodId(line.name, foods),
        grams: lineGrams(line),
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
  input: { title?: string; servings?: number; cookedWeightG?: number | null },
) {
  await loadDetail(db, userId, id);
  const patch: { title?: string; servings?: number; cookedWeightG?: number | null; updatedAt: Date } = {
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
  await db.update(nutritionRecipes).set(patch).where(eq(nutritionRecipes.id, id));
  return loadDetail(db, userId, id);
}

export async function updateNutritionRecipeItem(
  db: Database,
  userId: string,
  recipeId: string,
  itemId: string,
  input: { foodId?: string | null; grams?: number | null },
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
  return loadDetail(db, userId, recipeId);
}

export async function addNutritionRecipeItem(
  db: Database,
  userId: string,
  recipeId: string,
  input: { foodId: string; grams: number; sourceLine?: string },
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
  return loadDetail(db, userId, recipeId);
}

export async function deleteNutritionRecipeItem(db: Database, userId: string, recipeId: string, itemId: string) {
  await loadDetail(db, userId, recipeId);
  const [row] = await db
    .delete(nutritionRecipeItems)
    .where(and(eq(nutritionRecipeItems.id, itemId), eq(nutritionRecipeItems.nutritionRecipeId, recipeId)))
    .returning();
  if (!row) {
    throw new AppError("not_found", "Ingredient line not found.", 404);
  }
  await touch(db, recipeId);
  return loadDetail(db, userId, recipeId);
}

export async function publishNutritionRecipe(db: Database, userId: string, id: string) {
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
      per100g: detail.per100g,
    });
  }
  await touch(db, id);
  return loadDetail(db, userId, id);
}

export async function deleteNutritionRecipe(db: Database, userId: string, id: string) {
  const detail = await loadDetail(db, userId, id);
  if (detail.libraryFood) {
    const { deleteUserFood } = await import("./nutritionStore");
    await deleteUserFood(db, userId, detail.libraryFood.id);
  }
  await db.delete(nutritionRecipes).where(and(eq(nutritionRecipes.id, id), eq(nutritionRecipes.userId, userId)));
}
