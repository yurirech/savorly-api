import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import {
  buildDiaryMeals,
  buildQuickDiaryNutrients,
  computeNutritionTargets,
  dayTotalsFromMeals,
  DIARY_MEAL_NAME_MAX_LENGTH,
  parseQuickDiaryLabel,
  QUICK_DIARY_ENTRY_GRAMS,
  QUICK_DIARY_LABEL_MAX_LENGTH,
  remainingMacros,
  scaleNutrition,
  type DiaryDayResponse,
  type DiaryEntry,
  type DiaryEntryKind,
  type NutrientVector,
  type NutritionProfile,
  type NutritionProfileInput,
  type NutritionProfileResponse,
  type QuickDiaryNutrientsInput,
  type UserFood,
  type UserFoodSource,
} from "@savorly/shared";
import type { Database } from "../db/client";
import { diaryEntries, diaryMeals, nutritionProfiles, userFoods } from "../db/schema";
import { AppError } from "../errors";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type ProfileRow = typeof nutritionProfiles.$inferSelect;
type FoodRow = typeof userFoods.$inferSelect;
type DiaryRow = typeof diaryEntries.$inferSelect;
type MealRow = typeof diaryMeals.$inferSelect;

const FREQUENT_GRAMS_LIMIT = 5;
const FREQUENT_GRAMS_SCAN = 100;

export function parseIsoDate(value: string): string {
  const trimmed = value.trim();
  if (!ISO_DATE.test(trimmed)) {
    throw new AppError("validation_error", "Date must be YYYY-MM-DD.", 400);
  }
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("validation_error", "Date must be YYYY-MM-DD.", 400);
  }
  return trimmed;
}

export function asIsoDate(value: string | Date): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

function requireNutrientVector(value: unknown, label: string): NutrientVector {
  if (!value || typeof value !== "object") {
    throw new AppError("validation_error", `${label} is invalid.`, 400);
  }
  const row = value as NutrientVector;
  if (![row.kcal, row.proteinG, row.carbsG, row.fatG].every((item) => typeof item === "number" && Number.isFinite(item))) {
    throw new AppError("validation_error", `${label} needs calories, protein, carbs, and fat.`, 400);
  }
  return row;
}

function profileFromRow(row: ProfileRow): NutritionProfile {
  return {
    sex: row.sex as NutritionProfileInput["sex"],
    age: row.age,
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    activity: row.activity as NutritionProfileInput["activity"],
    goal: row.goal as NutritionProfileInput["goal"],
    weeklyKgChange: row.weeklyKgChange,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function foodFromRow(row: FoodRow): UserFood {
  return {
    id: row.id,
    name: row.name,
    source: row.source as UserFoodSource,
    fdcId: row.fdcId,
    nevoCode: row.nevoCode,
    per100g: requireNutrientVector(row.per100g, "Food nutrition"),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function diaryFromRow(row: DiaryRow, displayName: string): DiaryEntry {
  const kind = (row.kind === "quick" ? "quick" : "food") as DiaryEntryKind;
  return {
    id: row.id,
    date: asIsoDate(row.date),
    mealId: row.mealId,
    kind,
    foodId: row.foodId,
    label: row.label ?? undefined,
    foodName: displayName,
    grams: row.grams,
    nutrients: requireNutrientVector(row.nutrients, "Diary nutrients"),
    createdAt: row.createdAt.toISOString(),
  };
}

function entryDisplayName(row: DiaryRow, joinedFoodName: string | null): string {
  if (row.kind === "quick") {
    return row.label ?? "Quick entry";
  }
  return joinedFoodName ?? "Food";
}

function parseQuickLabelInput(label: string | undefined): string {
  const trimmed = label?.trim();
  if (trimmed && trimmed.length > QUICK_DIARY_LABEL_MAX_LENGTH) {
    throw new AppError(
      "validation_error",
      `Name must be at most ${QUICK_DIARY_LABEL_MAX_LENGTH} characters.`,
      400,
    );
  }
  return parseQuickDiaryLabel(label);
}

function parseQuickNutrientsInput(input: QuickDiaryNutrientsInput): NutrientVector {
  if (!(input.kcal >= 0) || !Number.isFinite(input.kcal)) {
    throw new AppError("validation_error", "Calories must be zero or more.", 400);
  }
  const optionalMacro = (value: number | undefined, label: string): number => {
    if (value == null) {
      return 0;
    }
    if (!(value >= 0) || !Number.isFinite(value)) {
      throw new AppError("validation_error", `${label} must be zero or more.`, 400);
    }
    return value;
  };
  return buildQuickDiaryNutrients({
    kcal: input.kcal,
    proteinG: optionalMacro(input.proteinG, "Protein"),
    carbsG: optionalMacro(input.carbsG, "Carbs"),
    fatG: optionalMacro(input.fatG, "Fat"),
  });
}

function parseMealName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new AppError("validation_error", "Give the meal group a name.", 400);
  }
  if (trimmed.length > DIARY_MEAL_NAME_MAX_LENGTH) {
    throw new AppError(
      "validation_error",
      `Meal name must be at most ${DIARY_MEAL_NAME_MAX_LENGTH} characters.`,
      400,
    );
  }
  return trimmed;
}

async function getOwnedDiaryMeal(db: Database, userId: string, mealId: string): Promise<MealRow> {
  const [row] = await db
    .select()
    .from(diaryMeals)
    .where(and(eq(diaryMeals.id, mealId), eq(diaryMeals.userId, userId)))
    .limit(1);
  if (!row) {
    throw new AppError("not_found", "Meal group not found.", 404);
  }
  return row;
}

async function getOwnedDiaryEntry(db: Database, userId: string, entryId: string): Promise<DiaryRow> {
  const [row] = await db
    .select()
    .from(diaryEntries)
    .where(and(eq(diaryEntries.id, entryId), eq(diaryEntries.userId, userId)))
    .limit(1);
  if (!row) {
    throw new AppError("not_found", "Diary entry not found.", 404);
  }
  return row;
}

function validateGrams(grams: number): void {
  if (!(grams > 0) || grams > 5000) {
    throw new AppError("validation_error", "Grams must be between 0 and 5000.", 400);
  }
}

export function profileResponse(profile: NutritionProfile | null): NutritionProfileResponse {
  return {
    profile,
    targets: profile ? computeNutritionTargets(profile) : null,
  };
}

export async function getNutritionProfile(db: Database, userId: string): Promise<NutritionProfileResponse> {
  const [row] = await db.select().from(nutritionProfiles).where(eq(nutritionProfiles.userId, userId)).limit(1);
  return profileResponse(row ? profileFromRow(row) : null);
}

export async function upsertNutritionProfile(
  db: Database,
  userId: string,
  input: NutritionProfileInput,
): Promise<NutritionProfileResponse> {
  const weeklyKgChange = input.goal === "maintain" ? 0 : input.weeklyKgChange;
  const values = {
    userId,
    sex: input.sex,
    age: input.age,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    activity: input.activity,
    goal: input.goal,
    weeklyKgChange,
    updatedAt: new Date(),
  };

  const [row] = await db
    .insert(nutritionProfiles)
    .values(values)
    .onConflictDoUpdate({
      target: nutritionProfiles.userId,
      set: {
        sex: values.sex,
        age: values.age,
        heightCm: values.heightCm,
        weightKg: values.weightKg,
        activity: values.activity,
        goal: values.goal,
        weeklyKgChange: values.weeklyKgChange,
        updatedAt: values.updatedAt,
      },
    })
    .returning();

  if (!row) {
    throw new AppError("internal_error", "Could not save nutrition profile.", 500);
  }
  return profileResponse(profileFromRow(row));
}

export async function listUserFoods(db: Database, userId: string, query?: string): Promise<UserFood[]> {
  const trimmed = query?.trim();
  const rows = trimmed
    ? await db
        .select()
        .from(userFoods)
        .where(and(eq(userFoods.userId, userId), ilike(userFoods.name, `%${trimmed}%`)))
        .orderBy(userFoods.name)
    : await db.select().from(userFoods).where(eq(userFoods.userId, userId)).orderBy(userFoods.name);
  return rows.map(foodFromRow);
}

export async function createManualFood(
  db: Database,
  userId: string,
  name: string,
  per100g: NutrientVector,
): Promise<UserFood> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new AppError("validation_error", "Give the food a name.", 400);
  }
  const [row] = await db
    .insert(userFoods)
    .values({
      userId,
      name: trimmed,
      source: "manual",
      fdcId: null,
      nevoCode: null,
      per100g: requireNutrientVector(per100g, "Food nutrition"),
    })
    .returning();
  if (!row) {
    throw new AppError("internal_error", "Could not save food.", 500);
  }
  return foodFromRow(row);
}

export async function importUsdaFood(
  db: Database,
  userId: string,
  input: { fdcId: number; name: string; per100g: NutrientVector },
): Promise<UserFood> {
  const [existing] = await db
    .select()
    .from(userFoods)
    .where(and(eq(userFoods.userId, userId), eq(userFoods.fdcId, input.fdcId)))
    .limit(1);
  if (existing) {
    return foodFromRow(existing);
  }

  const [row] = await db
    .insert(userFoods)
    .values({
      userId,
      name: input.name.trim(),
      source: "usda",
      fdcId: input.fdcId,
      nevoCode: null,
      per100g: input.per100g,
    })
    .returning();
  if (!row) {
    throw new AppError("internal_error", "Could not import food.", 500);
  }
  return foodFromRow(row);
}

export async function importNevoFood(
  db: Database,
  userId: string,
  input: { nevoCode: number; name: string; per100g: NutrientVector },
): Promise<UserFood> {
  const [existing] = await db
    .select()
    .from(userFoods)
    .where(and(eq(userFoods.userId, userId), eq(userFoods.nevoCode, input.nevoCode)))
    .limit(1);
  if (existing) {
    return foodFromRow(existing);
  }

  const [row] = await db
    .insert(userFoods)
    .values({
      userId,
      name: input.name.trim(),
      source: "nevo",
      fdcId: null,
      nevoCode: input.nevoCode,
      per100g: input.per100g,
    })
    .returning();
  if (!row) {
    throw new AppError("internal_error", "Could not import food.", 500);
  }
  return foodFromRow(row);
}

export async function deleteUserFood(db: Database, userId: string, foodId: string): Promise<void> {
  const food = await getOwnedUserFood(db, userId, foodId);
  const [used] = await db
    .select({ count: sql<number>`count(*)` })
    .from(diaryEntries)
    .where(and(eq(diaryEntries.foodId, food.id), eq(diaryEntries.kind, "food")));
  if (Number(used?.count ?? 0) > 0) {
    throw new AppError("validation_error", "This food is used in the diary. Remove those entries first.", 400);
  }
  await db.delete(userFoods).where(and(eq(userFoods.id, food.id), eq(userFoods.userId, userId)));
}

export async function getDiaryDay(db: Database, userId: string, date: string): Promise<DiaryDayResponse> {
  const isoDate = parseIsoDate(date);
  const mealRows = await db
    .select()
    .from(diaryMeals)
    .where(and(eq(diaryMeals.userId, userId), eq(diaryMeals.date, isoDate)))
    .orderBy(asc(diaryMeals.sortOrder), asc(diaryMeals.createdAt));

  const entryRows = await db
    .select({
      entry: diaryEntries,
      foodName: userFoods.name,
    })
    .from(diaryEntries)
    .leftJoin(userFoods, eq(userFoods.id, diaryEntries.foodId))
    .where(and(eq(diaryEntries.userId, userId), eq(diaryEntries.date, isoDate)))
    .orderBy(desc(diaryEntries.createdAt));

  const entries = entryRows.map((row) =>
    diaryFromRow(row.entry, entryDisplayName(row.entry, row.foodName)),
  );
  const meals = buildDiaryMeals(
    mealRows.map((row) => ({
      id: row.id,
      date: asIsoDate(row.date),
      name: row.name,
      sortOrder: row.sortOrder,
    })),
    entries,
  );
  const totals = dayTotalsFromMeals(meals);
  const profile = await getNutritionProfile(db, userId);
  return {
    date: isoDate,
    meals,
    totals,
    remaining: profile.targets ? remainingMacros(profile.targets, totals) : null,
    targets: profile.targets,
  };
}

export async function createDiaryMeal(
  db: Database,
  userId: string,
  input: { date: string; name: string },
): Promise<DiaryDayResponse> {
  const isoDate = parseIsoDate(input.date);
  const name = parseMealName(input.name);
  const [maxOrder] = await db
    .select({ value: sql<number>`coalesce(max(${diaryMeals.sortOrder}), -1)` })
    .from(diaryMeals)
    .where(and(eq(diaryMeals.userId, userId), eq(diaryMeals.date, isoDate)));

  await db.insert(diaryMeals).values({
    userId,
    date: isoDate,
    name,
    sortOrder: Number(maxOrder?.value ?? -1) + 1,
  });

  return getDiaryDay(db, userId, isoDate);
}

export async function updateDiaryMeal(
  db: Database,
  userId: string,
  mealId: string,
  input: { name?: string; sortOrder?: number },
): Promise<DiaryDayResponse> {
  const meal = await getOwnedDiaryMeal(db, userId, mealId);
  const patch: Partial<Pick<MealRow, "name" | "sortOrder">> = {};
  if (input.name != null) {
    patch.name = parseMealName(input.name);
  }
  if (input.sortOrder != null) {
    if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
      throw new AppError("validation_error", "Sort order must be a non-negative integer.", 400);
    }
    patch.sortOrder = input.sortOrder;
  }
  if (Object.keys(patch).length === 0) {
    throw new AppError("validation_error", "Nothing to update.", 400);
  }
  await db.update(diaryMeals).set(patch).where(eq(diaryMeals.id, meal.id));
  return getDiaryDay(db, userId, asIsoDate(meal.date));
}

export async function deleteDiaryMeal(db: Database, userId: string, mealId: string): Promise<DiaryDayResponse> {
  const meal = await getOwnedDiaryMeal(db, userId, mealId);
  await db.delete(diaryMeals).where(eq(diaryMeals.id, meal.id));
  return getDiaryDay(db, userId, asIsoDate(meal.date));
}

export async function addDiaryEntry(
  db: Database,
  userId: string,
  input: { mealId: string; foodId: string; grams: number; date: string },
): Promise<DiaryDayResponse> {
  const isoDate = parseIsoDate(input.date);
  validateGrams(input.grams);
  const meal = await getOwnedDiaryMeal(db, userId, input.mealId);
  if (asIsoDate(meal.date) !== isoDate) {
    throw new AppError("validation_error", "Meal group belongs to a different day.", 400);
  }
  const food = await getOwnedUserFood(db, userId, input.foodId);
  const nutrients = scaleNutrition(food.per100g, input.grams);
  await db.insert(diaryEntries).values({
    userId,
    mealId: meal.id,
    foodId: food.id,
    kind: "food",
    date: isoDate,
    grams: input.grams,
    nutrients,
  });
  return getDiaryDay(db, userId, isoDate);
}

export async function addQuickDiaryEntry(
  db: Database,
  userId: string,
  input: {
    mealId: string;
    date: string;
    label?: string;
    kcal: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
  },
): Promise<DiaryDayResponse> {
  const isoDate = parseIsoDate(input.date);
  const meal = await getOwnedDiaryMeal(db, userId, input.mealId);
  if (asIsoDate(meal.date) !== isoDate) {
    throw new AppError("validation_error", "Meal group belongs to a different day.", 400);
  }
  const label = parseQuickLabelInput(input.label);
  const nutrients = parseQuickNutrientsInput(input);
  await db.insert(diaryEntries).values({
    userId,
    mealId: meal.id,
    foodId: null,
    kind: "quick",
    label,
    date: isoDate,
    grams: QUICK_DIARY_ENTRY_GRAMS,
    nutrients,
  });
  return getDiaryDay(db, userId, isoDate);
}

export async function updateDiaryEntry(
  db: Database,
  userId: string,
  entryId: string,
  input: unknown,
): Promise<DiaryDayResponse> {
  const entry = await getOwnedDiaryEntry(db, userId, entryId);
  if (entry.kind === "quick") {
    const body = input as QuickDiaryNutrientsInput & { label?: string };
    if (body == null || typeof body !== "object" || !("kcal" in body)) {
      throw new AppError("validation_error", "Calories are required.", 400);
    }
    const label = body.label != null ? parseQuickLabelInput(body.label) : entry.label ?? parseQuickDiaryLabel(null);
    const nutrients = parseQuickNutrientsInput(body);
    await db
      .update(diaryEntries)
      .set({ label, nutrients })
      .where(eq(diaryEntries.id, entry.id));
    return getDiaryDay(db, userId, asIsoDate(entry.date));
  }

  const body = input as { grams?: number };
  if (body?.grams == null) {
    throw new AppError("validation_error", "Grams are required.", 400);
  }
  validateGrams(body.grams);
  if (!entry.foodId) {
    throw new AppError("internal_error", "Food entry is missing food.", 500);
  }
  const food = await getOwnedUserFood(db, userId, entry.foodId);
  const nutrients = scaleNutrition(food.per100g, body.grams);
  await db
    .update(diaryEntries)
    .set({ grams: body.grams, nutrients })
    .where(eq(diaryEntries.id, entry.id));
  return getDiaryDay(db, userId, asIsoDate(entry.date));
}

export async function getFrequentGramsForFood(
  db: Database,
  userId: string,
  foodId: string,
): Promise<number[]> {
  await getOwnedUserFood(db, userId, foodId);
  const rows = await db
    .select({ grams: diaryEntries.grams })
    .from(diaryEntries)
    .where(and(eq(diaryEntries.userId, userId), eq(diaryEntries.foodId, foodId), eq(diaryEntries.kind, "food")))
    .orderBy(desc(diaryEntries.createdAt))
    .limit(FREQUENT_GRAMS_SCAN);

  const counts = new Map<number, number>();
  for (const row of rows) {
    counts.set(row.grams, (counts.get(row.grams) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0] - a[0])
    .slice(0, FREQUENT_GRAMS_LIMIT)
    .map(([grams]) => grams);
}

export async function deleteDiaryEntry(db: Database, userId: string, entryId: string): Promise<DiaryDayResponse> {
  const [row] = await db
    .delete(diaryEntries)
    .where(and(eq(diaryEntries.id, entryId), eq(diaryEntries.userId, userId)))
    .returning();
  if (!row) {
    throw new AppError("not_found", "Diary entry not found.", 404);
  }
  return getDiaryDay(db, userId, asIsoDate(row.date));
}

export async function getOwnedUserFood(db: Database, userId: string, foodId: string): Promise<UserFood> {
  const [row] = await db
    .select()
    .from(userFoods)
    .where(and(eq(userFoods.id, foodId), eq(userFoods.userId, userId)))
    .limit(1);
  if (!row) {
    throw new AppError("not_found", "Food not found.", 404);
  }
  return foodFromRow(row);
}
