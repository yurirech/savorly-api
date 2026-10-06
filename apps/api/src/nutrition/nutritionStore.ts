import { and, asc, desc, eq, gte, gt, ilike, inArray, lt, or, sql } from "drizzle-orm";
import {
  buildDiaryMeals,
  buildQuickDiaryNutrients,
  computeNutritionTargets,
  dayTotalsFromMeals,
  DIARY_MEAL_NAME_MAX_LENGTH,
  mealsMakeCompleteDay,
  parseQuickDiaryLabel,
  QUICK_DIARY_ENTRY_GRAMS,
  QUICK_DIARY_LABEL_MAX_LENGTH,
  remainingMacros,
  scaleNutrition,
  type DiaryDayResponse,
  type DiaryEntry,
  type DiaryMealGroup,
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
import { diaryDayTargets, diaryEntries, diaryMealTemplates, diaryMeals, mealStaples, nevoFoods, nutritionProfiles, userFoods, users } from "../db/schema";
import { nevoFoodsReady } from "./nevoStore";
import { nevoDisplayName, nevoEnglishRenames } from "./nevoNames";
import { STAPLE_NEVO_CODES } from "./stapleNevoCodes";
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
  const source = row.source as UserFoodSource;
  return {
    id: row.id,
    name: row.name,
    originalName: row.originalName,
    source,
    fdcId: source === "fatsecret" ? null : row.fdcId,
    fatsecretId: source === "fatsecret" ? row.fdcId : null,
    nevoCode: row.nevoCode,
    nutritionRecipeId: row.nutritionRecipeId,
    servingWeightG: row.servingWeightG ?? null,
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
  if (!(grams >= 0) || grams > 5000 || !Number.isFinite(grams)) {
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
  const pattern = trimmed ? `%${trimmed.replaceAll("%", "").replaceAll("_", "")}%` : "";
  const rows = trimmed
    ? await db
        .select()
        .from(userFoods)
        .where(
          and(
            eq(userFoods.userId, userId),
            or(ilike(userFoods.name, pattern), ilike(userFoods.originalName, pattern)),
          ),
        )
        .orderBy(userFoods.name)
    : await db.select().from(userFoods).where(eq(userFoods.userId, userId)).orderBy(userFoods.name);
  return rows.map(foodFromRow);
}

export async function createManualFood(
  db: Database,
  userId: string,
  name: string,
  per100g: NutrientVector,
  id?: string,
  servingWeightG?: number | null,
): Promise<UserFood> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new AppError("validation_error", "Give the food a name.", 400);
  }
  const values = {
    userId,
    name: trimmed,
    originalName: trimmed,
    source: "manual" as const,
    fdcId: null,
    nevoCode: null,
    servingWeightG: servingWeightG ?? null,
    per100g: requireNutrientVector(per100g, "Food nutrition"),
    ...(id ? { id } : {}),
  };
  if (id) {
    await db.insert(userFoods).values(values).onConflictDoNothing();
    return getOwnedUserFood(db, userId, id);
  }
  const [row] = await db.insert(userFoods).values(values).returning();
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
    .where(and(eq(userFoods.userId, userId), eq(userFoods.source, "usda"), eq(userFoods.fdcId, input.fdcId)))
    .limit(1);
  if (existing) {
    return foodFromRow(existing);
  }

  const [row] = await db
    .insert(userFoods)
    .values({
      userId,
      name: input.name.trim(),
      originalName: input.name.trim(),
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

export async function importFatsecretFood(
  db: Database,
  userId: string,
  input: { foodId: number; name: string; per100g: NutrientVector },
): Promise<UserFood> {
  const [existing] = await db
    .select()
    .from(userFoods)
    .where(and(eq(userFoods.userId, userId), eq(userFoods.source, "fatsecret"), eq(userFoods.fdcId, input.foodId)))
    .limit(1);
  if (existing) {
    return foodFromRow(existing);
  }

  const [row] = await db
    .insert(userFoods)
    .values({
      userId,
      name: input.name.trim(),
      originalName: input.name.trim(),
      source: "fatsecret",
      fdcId: input.foodId,
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
  input: { nevoCode: number; name: string; per100g: NutrientVector; id?: string },
): Promise<UserFood> {
  const [existing] = await db
    .select()
    .from(userFoods)
    .where(and(eq(userFoods.userId, userId), eq(userFoods.nevoCode, input.nevoCode)))
    .limit(1);
  if (existing) {
    return foodFromRow(existing);
  }

  const values = {
    userId,
    name: input.name.trim(),
    originalName: input.name.trim(),
    source: "nevo" as const,
    fdcId: null,
    nevoCode: input.nevoCode,
    per100g: input.per100g,
    ...(input.id ? { id: input.id } : {}),
  };
  if (input.id) {
    await db.insert(userFoods).values(values).onConflictDoNothing();
    return getOwnedUserFood(db, userId, input.id);
  }
  const [row] = await db.insert(userFoods).values(values).returning();
  if (!row) {
    throw new AppError("internal_error", "Could not import food.", 500);
  }
  return foodFromRow(row);
}

export async function renameUserFood(db: Database, userId: string, foodId: string, name: string): Promise<UserFood> {
  return updateUserFood(db, userId, foodId, { name });
}

export async function updateUserFood(
  db: Database,
  userId: string,
  foodId: string,
  patch: { name?: string; servingWeightG?: number | null },
): Promise<UserFood> {
  const food = await getOwnedUserFood(db, userId, foodId);
  const next: { name?: string; servingWeightG?: number | null; updatedAt: Date } = { updatedAt: new Date() };
  if (patch.name != null) {
    const trimmed = patch.name.trim();
    if (!trimmed || trimmed.length > 120) {
      throw new AppError("validation_error", "Name must be 1–120 characters.", 400);
    }
    next.name = trimmed;
  }
  if (patch.servingWeightG !== undefined) {
    if (patch.servingWeightG != null && (!(patch.servingWeightG > 0) || patch.servingWeightG > 5000)) {
      throw new AppError("validation_error", "Serving weight must be between 0 and 5000 g.", 400);
    }
    next.servingWeightG = patch.servingWeightG;
  }
  const [row] = await db
    .update(userFoods)
    .set(next)
    .where(and(eq(userFoods.id, food.id), eq(userFoods.userId, userId)))
    .returning();
  if (!row) {
    throw new AppError("internal_error", "Could not update food.", 500);
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

async function listMealTemplates(db: Database, userId: string) {
  return db
    .select()
    .from(diaryMealTemplates)
    .where(eq(diaryMealTemplates.userId, userId))
    .orderBy(asc(diaryMealTemplates.sortOrder));
}

async function seedMealTemplatesIfEmpty(db: Database, userId: string) {
  const [user] = await db
    .select({ seededAt: users.mealTemplatesSeededAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (user?.seededAt) {
    return listMealTemplates(db, userId);
  }
  const existing = await listMealTemplates(db, userId);
  if (existing.length === 0) {
    const [latest] = await db
      .select({ date: diaryMeals.date })
      .from(diaryMeals)
      .where(eq(diaryMeals.userId, userId))
      .orderBy(desc(diaryMeals.date))
      .limit(1);
    if (latest) {
      const source = await db
        .select()
        .from(diaryMeals)
        .where(and(eq(diaryMeals.userId, userId), eq(diaryMeals.date, latest.date)))
        .orderBy(asc(diaryMeals.sortOrder), asc(diaryMeals.createdAt));
      if (source.length > 0) {
        const seen = new Set<string>();
        await db.insert(diaryMealTemplates).values(
          source.flatMap((meal) => {
            if (seen.has(meal.name)) return [];
            seen.add(meal.name);
            return [{ userId, name: meal.name, sortOrder: meal.sortOrder }];
          }),
        );
      }
    }
  }
  await db.update(users).set({ mealTemplatesSeededAt: new Date() }).where(eq(users.id, userId));
  return listMealTemplates(db, userId);
}

async function materializeMealTemplates(db: Database, userId: string, isoDate: string) {
  const templates = await seedMealTemplatesIfEmpty(db, userId);
  if (templates.length === 0) {
    return;
  }
  const present = await db
    .select({ name: diaryMeals.name })
    .from(diaryMeals)
    .where(and(eq(diaryMeals.userId, userId), eq(diaryMeals.date, isoDate)));
  const names = new Set(present.map((row) => row.name));
  const missing = templates.filter((template) => !names.has(template.name));
  if (missing.length === 0) {
    return;
  }
  await db.insert(diaryMeals).values(
    missing.map((template) => ({
      userId,
      date: isoDate,
      name: template.name,
      sortOrder: template.sortOrder,
    })),
  );
}

async function upsertMealTemplate(db: Database, userId: string, name: string) {
  const [existing] = await db
    .select({ id: diaryMealTemplates.id })
    .from(diaryMealTemplates)
    .where(and(eq(diaryMealTemplates.userId, userId), eq(diaryMealTemplates.name, name)))
    .limit(1);
  if (existing) {
    return;
  }
  const [maxOrder] = await db
    .select({ value: sql<number>`coalesce(max(${diaryMealTemplates.sortOrder}), -1)` })
    .from(diaryMealTemplates)
    .where(eq(diaryMealTemplates.userId, userId));
  await db.insert(diaryMealTemplates).values({
    userId,
    name,
    sortOrder: Number(maxOrder?.value ?? -1) + 1,
  });
}

async function annotateDiaryMeals(
  db: Database,
  userId: string,
  isoDate: string,
  meals: DiaryMealGroup[],
): Promise<DiaryMealGroup[]> {
  const names = [...new Set(meals.map((meal) => meal.name))];
  if (names.length === 0) {
    return meals;
  }
  const earlier = await db
    .select({ name: diaryMeals.name })
    .from(diaryMeals)
    .innerJoin(diaryEntries, eq(diaryEntries.mealId, diaryMeals.id))
    .where(and(eq(diaryMeals.userId, userId), lt(diaryMeals.date, isoDate), inArray(diaryMeals.name, names)));
  const earlierNames = new Set(earlier.map((row) => row.name));
  const stapleRows = await db
    .select({ mealName: mealStaples.mealName })
    .from(mealStaples)
    .where(and(eq(mealStaples.userId, userId), inArray(mealStaples.mealName, names)));
  const stapleCounts = new Map<string, number>();
  for (const row of stapleRows) {
    stapleCounts.set(row.mealName, (stapleCounts.get(row.mealName) ?? 0) + 1);
  }
  return meals.map((meal) => ({
    ...meal,
    canCopyPrevious: earlierNames.has(meal.name),
    stapleCount: stapleCounts.get(meal.name) ?? 0,
  }));
}

export async function getDiaryDay(db: Database, userId: string, date: string): Promise<DiaryDayResponse> {
  const isoDate = parseIsoDate(date);
  await materializeMealTemplates(db, userId, isoDate);
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
  const built = buildDiaryMeals(
    mealRows.map((row) => ({
      id: row.id,
      date: asIsoDate(row.date),
      name: row.name,
      sortOrder: row.sortOrder,
    })),
    entries,
  );
  const meals = await annotateDiaryMeals(db, userId, isoDate, built);
  const totals = dayTotalsFromMeals(meals);
  const profile = await getNutritionProfile(db, userId);
  const [override] = await db
    .select({ kcal: diaryDayTargets.kcal })
    .from(diaryDayTargets)
    .where(and(eq(diaryDayTargets.userId, userId), eq(diaryDayTargets.date, isoDate)))
    .limit(1);
  const targets = profile.targets
    ? { ...profile.targets, kcal: override?.kcal ?? profile.targets.kcal }
    : null;
  return {
    date: isoDate,
    meals,
    totals,
    remaining: targets ? remainingMacros(targets, totals) : null,
    targets,
  };
}

export async function setDiaryDayTarget(db: Database, userId: string, date: string, kcal: number): Promise<DiaryDayResponse> {
  const isoDate = parseIsoDate(date);
  if (!Number.isFinite(kcal) || kcal < 1 || kcal > 20000) {
    throw new AppError("validation_error", "Enter a calorie target.", 400);
  }
  await db
    .insert(diaryDayTargets)
    .values({ userId, date: isoDate, kcal: Math.round(kcal) })
    .onConflictDoUpdate({
      target: [diaryDayTargets.userId, diaryDayTargets.date],
      set: { kcal: Math.round(kcal) },
    });
  return getDiaryDay(db, userId, isoDate);
}

export async function clearDiaryDayTarget(db: Database, userId: string, date: string): Promise<DiaryDayResponse> {
  const isoDate = parseIsoDate(date);
  await db.delete(diaryDayTargets).where(and(eq(diaryDayTargets.userId, userId), eq(diaryDayTargets.date, isoDate)));
  return getDiaryDay(db, userId, isoDate);
}

export async function rewriteFoodLogsFromDate(
  db: Database,
  userId: string,
  foodId: string,
  per100g: NutrientVector,
  fromDate: string,
) {
  const isoDate = parseIsoDate(fromDate);
  const rows = await db
    .select({ id: diaryEntries.id, grams: diaryEntries.grams })
    .from(diaryEntries)
    .where(
      and(
        eq(diaryEntries.userId, userId),
        eq(diaryEntries.foodId, foodId),
        eq(diaryEntries.kind, "food"),
        gte(diaryEntries.date, isoDate),
      ),
    );
  for (const row of rows) {
    await db
      .update(diaryEntries)
      .set({ nutrients: scaleNutrition(per100g, row.grams) })
      .where(eq(diaryEntries.id, row.id));
  }
}

export type DiaryWeekDay = {
  date: string;
  eatenKcal: number;
  targetKcal: number | null;
  complete: boolean;
};

export type DiaryWeek = {
  start: string;
  days: DiaryWeekDay[];
  eatenKcal: number;
  targetKcal: number | null;
  remainingKcal: number | null;
  averageKcal: number;
};

export async function getDiaryWeek(db: Database, userId: string, start: string): Promise<DiaryWeek> {
  const isoStart = parseIsoDate(start);
  const dates = Array.from({ length: 7 }, (_, index) => shiftUtcDate(isoStart, index));
  const end = dates[6]!;
  const profile = await getNutritionProfile(db, userId);
  const overrides = await db
    .select({ date: diaryDayTargets.date, kcal: diaryDayTargets.kcal })
    .from(diaryDayTargets)
    .where(and(eq(diaryDayTargets.userId, userId), gte(diaryDayTargets.date, isoStart), lt(diaryDayTargets.date, shiftUtcDate(end, 1))));
  const overrideByDate = new Map(overrides.map((row) => [asIsoDate(row.date), row.kcal]));
  const entries = await db
    .select({ date: diaryEntries.date, nutrients: diaryEntries.nutrients })
    .from(diaryEntries)
    .where(and(eq(diaryEntries.userId, userId), gte(diaryEntries.date, isoStart), lt(diaryEntries.date, shiftUtcDate(end, 1))));
  const eatenByDate = new Map<string, number>();
  for (const row of entries) {
    const key = asIsoDate(row.date);
    const kcal = nutrientKcal(row.nutrients);
    eatenByDate.set(key, (eatenByDate.get(key) ?? 0) + kcal);
  }
  const meals = await db
    .select({ id: diaryMeals.id, date: diaryMeals.date })
    .from(diaryMeals)
    .where(
      and(eq(diaryMeals.userId, userId), gte(diaryMeals.date, isoStart), lt(diaryMeals.date, shiftUtcDate(end, 1))),
    );
  const mealIds = meals.map((meal) => meal.id);
  const entryCounts =
    mealIds.length === 0
      ? []
      : await db
          .select({ mealId: diaryEntries.mealId, count: sql<number>`count(*)` })
          .from(diaryEntries)
          .where(inArray(diaryEntries.mealId, mealIds))
          .groupBy(diaryEntries.mealId);
  const countByMeal = new Map(entryCounts.map((row) => [row.mealId, Number(row.count)]));
  const mealsByDate = new Map<string, string[]>();
  for (const meal of meals) {
    const key = asIsoDate(meal.date);
    const list = mealsByDate.get(key) ?? [];
    list.push(meal.id);
    mealsByDate.set(key, list);
  }
  const days = dates.map((date) => {
    const dayMeals = mealsByDate.get(date) ?? [];
    const mealsWithEntries = dayMeals.filter((mealId) => (countByMeal.get(mealId) ?? 0) > 0).length;
    return {
      date,
      eatenKcal: Math.round(eatenByDate.get(date) ?? 0),
      targetKcal: overrideByDate.get(date) ?? profile.targets?.kcal ?? null,
      complete: mealsMakeCompleteDay(dayMeals.length, mealsWithEntries),
    };
  });
  const eatenKcal = days.reduce((sum, day) => sum + day.eatenKcal, 0);
  const knownTargets = days.every((day) => day.targetKcal != null);
  const targetKcal = knownTargets ? days.reduce((sum, day) => sum + (day.targetKcal ?? 0), 0) : null;
  return {
    start: isoStart,
    days,
    eatenKcal,
    targetKcal,
    remainingKcal: targetKcal == null ? null : targetKcal - eatenKcal,
    averageKcal: Math.round(eatenKcal / 7),
  };
}

function shiftUtcDate(iso: string, days: number): string {
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function nutrientKcal(value: unknown): number {
  if (!value || typeof value !== "object" || !("kcal" in value)) return 0;
  const kcal = (value as { kcal?: unknown }).kcal;
  return typeof kcal === "number" && Number.isFinite(kcal) ? kcal : 0;
}

export async function createDiaryMeal(
  db: Database,
  userId: string,
  input: { date: string; name: string; id?: string },
): Promise<DiaryDayResponse> {
  const isoDate = parseIsoDate(input.date);
  const name = parseMealName(input.name);
  await materializeMealTemplates(db, userId, isoDate);
  const [maxOrder] = await db
    .select({ value: sql<number>`coalesce(max(${diaryMeals.sortOrder}), -1)` })
    .from(diaryMeals)
    .where(and(eq(diaryMeals.userId, userId), eq(diaryMeals.date, isoDate)));

  await db
    .insert(diaryMeals)
    .values({
      userId,
      date: isoDate,
      name,
      sortOrder: Number(maxOrder?.value ?? -1) + 1,
      ...(input.id ? { id: input.id } : {}),
    })
    .onConflictDoNothing();
  await upsertMealTemplate(db, userId, name);

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
  const previousName = meal.name;
  if (patch.name != null && patch.name !== previousName) {
    const [clash] = await db
      .select({ id: diaryMealTemplates.id })
      .from(diaryMealTemplates)
      .where(and(eq(diaryMealTemplates.userId, userId), eq(diaryMealTemplates.name, patch.name)))
      .limit(1);
    if (clash) {
      throw new AppError("validation_error", "You already have a meal group with that name.", 400);
    }
  }
  await db.update(diaryMeals).set(patch).where(eq(diaryMeals.id, meal.id));
  if (patch.name != null && patch.name !== previousName) {
    await db
      .update(diaryMealTemplates)
      .set({ name: patch.name })
      .where(and(eq(diaryMealTemplates.userId, userId), eq(diaryMealTemplates.name, previousName)));
    await db
      .update(mealStaples)
      .set({ mealName: patch.name })
      .where(and(eq(mealStaples.userId, userId), eq(mealStaples.mealName, previousName)));
    await db
      .update(diaryMeals)
      .set({ name: patch.name })
      .where(
        and(eq(diaryMeals.userId, userId), eq(diaryMeals.name, previousName), gt(diaryMeals.date, meal.date)),
      );
  }
  if (patch.sortOrder != null) {
    await db
      .update(diaryMealTemplates)
      .set({ sortOrder: patch.sortOrder })
      .where(and(eq(diaryMealTemplates.userId, userId), eq(diaryMealTemplates.name, patch.name ?? previousName)));
  }
  return getDiaryDay(db, userId, asIsoDate(meal.date));
}

export async function deleteDiaryMeal(db: Database, userId: string, mealId: string): Promise<DiaryDayResponse> {
  const meal = await getOwnedDiaryMeal(db, userId, mealId);
  await db
    .delete(diaryMealTemplates)
    .where(and(eq(diaryMealTemplates.userId, userId), eq(diaryMealTemplates.name, meal.name)));
  await db.delete(diaryMeals).where(eq(diaryMeals.id, meal.id));
  return getDiaryDay(db, userId, asIsoDate(meal.date));
}

export async function addDiaryEntry(
  db: Database,
  userId: string,
  input: { mealId: string; foodId: string; grams: number; date: string; id?: string },
): Promise<DiaryDayResponse> {
  const isoDate = parseIsoDate(input.date);
  validateGrams(input.grams);
  const meal = await getOwnedDiaryMeal(db, userId, input.mealId);
  if (asIsoDate(meal.date) !== isoDate) {
    throw new AppError("validation_error", "Meal group belongs to a different day.", 400);
  }
  const food = await getOwnedUserFood(db, userId, input.foodId);
  const nutrients = scaleNutrition(food.per100g, input.grams);
  await db
    .insert(diaryEntries)
    .values({
      userId,
      mealId: meal.id,
      foodId: food.id,
      kind: "food",
      date: isoDate,
      grams: input.grams,
      nutrients,
      ...(input.id ? { id: input.id } : {}),
    })
    .onConflictDoNothing();
  return getDiaryDay(db, userId, isoDate);
}

export type RelocatePair = { entryId: string; mealId: string };

export function buildRelocatePairs(
  entries: ReadonlyArray<{ id: string; mealId: string }>,
  meals: ReadonlyArray<{ id: string }>,
): RelocatePair[] {
  const pairs: RelocatePair[] = [];
  for (const entry of entries) {
    for (const meal of meals) {
      if (meal.id !== entry.mealId) {
        pairs.push({ entryId: entry.id, mealId: meal.id });
      }
    }
  }
  return pairs;
}

async function insertCopiedDiaryEntry(db: Database, userId: string, entry: DiaryRow, meal: MealRow): Promise<void> {
  if (entry.kind === "quick") {
    await db.insert(diaryEntries).values({
      userId,
      mealId: meal.id,
      foodId: null,
      kind: "quick",
      label: entry.label,
      date: meal.date,
      grams: entry.grams,
      nutrients: entry.nutrients,
    });
    return;
  }

  if (!entry.foodId) {
    throw new AppError("internal_error", "Food entry is missing food.", 500);
  }
  const food = await getOwnedUserFood(db, userId, entry.foodId);
  await db.insert(diaryEntries).values({
    userId,
    mealId: meal.id,
    foodId: food.id,
    kind: "food",
    date: meal.date,
    grams: entry.grams,
    nutrients: scaleNutrition(food.per100g, entry.grams),
  });
}

export async function copyDiaryEntry(
  db: Database,
  userId: string,
  entryId: string,
  targetMealId: string,
): Promise<DiaryDayResponse> {
  const entry = await getOwnedDiaryEntry(db, userId, entryId);
  const meal = await getOwnedDiaryMeal(db, userId, targetMealId);
  if (meal.id === entry.mealId) {
    throw new AppError("validation_error", "Pick a different meal group.", 400);
  }
  await insertCopiedDiaryEntry(db, userId, entry, meal);
  return getDiaryDay(db, userId, asIsoDate(meal.date));
}

export async function relocateDiaryEntries(
  db: Database,
  userId: string,
  input: { entryIds: string[]; mealIds: string[]; mode: "copy" | "move" },
): Promise<DiaryDayResponse> {
  const entryIds = [...new Set(input.entryIds)];
  const mealIds = [...new Set(input.mealIds)];
  if (entryIds.length === 0) {
    throw new AppError("validation_error", "Pick a food to copy.", 400);
  }
  if (mealIds.length === 0) {
    throw new AppError("validation_error", "Pick a meal group.", 400);
  }

  const entries = await Promise.all(entryIds.map((id) => getOwnedDiaryEntry(db, userId, id)));
  const meals = await Promise.all(mealIds.map((id) => getOwnedDiaryMeal(db, userId, id)));
  const pairs = buildRelocatePairs(entries, meals);
  if (pairs.length === 0) {
    throw new AppError("validation_error", "Pick a different meal group.", 400);
  }

  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const mealById = new Map(meals.map((meal) => [meal.id, meal]));
  for (const pair of pairs) {
    const entry = entryById.get(pair.entryId);
    const meal = mealById.get(pair.mealId);
    if (!entry || !meal) continue;
    await insertCopiedDiaryEntry(db, userId, entry, meal);
  }

  if (input.mode === "move") {
    await db
      .delete(diaryEntries)
      .where(and(eq(diaryEntries.userId, userId), inArray(diaryEntries.id, entryIds)));
  }

  return getDiaryDay(db, userId, asIsoDate(entries[0]!.date));
}

async function assertMealEmpty(db: Database, mealId: string): Promise<void> {
  const [row] = await db
    .select({ id: diaryEntries.id })
    .from(diaryEntries)
    .where(eq(diaryEntries.mealId, mealId))
    .limit(1);
  if (row) {
    throw new AppError("validation_error", "This group already has foods.", 400);
  }
}

async function lastLoggedGrams(db: Database, userId: string, foodId: string): Promise<number> {
  const [row] = await db
    .select({ grams: diaryEntries.grams })
    .from(diaryEntries)
    .where(and(eq(diaryEntries.userId, userId), eq(diaryEntries.foodId, foodId), eq(diaryEntries.kind, "food")))
    .orderBy(desc(diaryEntries.createdAt))
    .limit(1);
  return row?.grams ?? 0;
}

export async function copyPreviousDiaryMeal(db: Database, userId: string, mealId: string): Promise<DiaryDayResponse> {
  const meal = await getOwnedDiaryMeal(db, userId, mealId);
  await assertMealEmpty(db, meal.id);
  const [source] = await db
    .select({ id: diaryMeals.id })
    .from(diaryMeals)
    .innerJoin(diaryEntries, eq(diaryEntries.mealId, diaryMeals.id))
    .where(and(eq(diaryMeals.userId, userId), eq(diaryMeals.name, meal.name), lt(diaryMeals.date, meal.date)))
    .orderBy(desc(diaryMeals.date))
    .limit(1);
  if (!source) {
    throw new AppError("validation_error", "No earlier log for this group.", 400);
  }
  const rows = await db.select().from(diaryEntries).where(eq(diaryEntries.mealId, source.id));
  for (const entry of rows) {
    if (entry.kind === "quick") {
      await db.insert(diaryEntries).values({
        userId,
        mealId: meal.id,
        foodId: null,
        kind: "quick",
        label: entry.label,
        date: meal.date,
        grams: entry.grams,
        nutrients: entry.nutrients,
      });
      continue;
    }
    if (!entry.foodId) {
      continue;
    }
    const food = await getOwnedUserFood(db, userId, entry.foodId);
    await db.insert(diaryEntries).values({
      userId,
      mealId: meal.id,
      foodId: food.id,
      kind: "food",
      date: meal.date,
      grams: entry.grams,
      nutrients: scaleNutrition(food.per100g, entry.grams),
    });
  }
  return getDiaryDay(db, userId, asIsoDate(meal.date));
}

export async function listMealStapleNames(db: Database, userId: string, foodId: string): Promise<string[]> {
  await getOwnedUserFood(db, userId, foodId);
  const rows = await db
    .select({ mealName: mealStaples.mealName })
    .from(mealStaples)
    .where(and(eq(mealStaples.userId, userId), eq(mealStaples.foodId, foodId)))
    .orderBy(asc(mealStaples.mealName));
  return rows.map((row) => row.mealName);
}

export async function setMealStaple(
  db: Database,
  userId: string,
  foodId: string,
  input: { mealName: string; enabled: boolean; date: string },
): Promise<string[]> {
  await getOwnedUserFood(db, userId, foodId);
  const mealName = parseMealName(input.mealName);
  const isoDate = parseIsoDate(input.date);
  const day = await getDiaryDay(db, userId, isoDate);
  if (!day.meals.some((meal) => meal.name === mealName)) {
    throw new AppError("validation_error", "That meal group is not on this day.", 400);
  }
  if (input.enabled) {
    await db.insert(mealStaples).values({ userId, mealName, foodId }).onConflictDoNothing();
  } else {
    await db
      .delete(mealStaples)
      .where(and(eq(mealStaples.userId, userId), eq(mealStaples.mealName, mealName), eq(mealStaples.foodId, foodId)));
  }
  return listMealStapleNames(db, userId, foodId);
}

export async function logMealStaples(db: Database, userId: string, mealId: string): Promise<DiaryDayResponse> {
  const meal = await getOwnedDiaryMeal(db, userId, mealId);
  await assertMealEmpty(db, meal.id);
  const staples = await db
    .select({ foodId: mealStaples.foodId })
    .from(mealStaples)
    .where(and(eq(mealStaples.userId, userId), eq(mealStaples.mealName, meal.name)));
  if (staples.length === 0) {
    throw new AppError("validation_error", "No staples for this group.", 400);
  }
  for (const staple of staples) {
    const food = await getOwnedUserFood(db, userId, staple.foodId);
    const grams = await lastLoggedGrams(db, userId, food.id);
    await db.insert(diaryEntries).values({
      userId,
      mealId: meal.id,
      foodId: food.id,
      kind: "food",
      date: meal.date,
      grams,
      nutrients: scaleNutrition(food.per100g, grams),
    });
  }
  return getDiaryDay(db, userId, asIsoDate(meal.date));
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
    id?: string;
  },
): Promise<DiaryDayResponse> {
  const isoDate = parseIsoDate(input.date);
  const meal = await getOwnedDiaryMeal(db, userId, input.mealId);
  if (asIsoDate(meal.date) !== isoDate) {
    throw new AppError("validation_error", "Meal group belongs to a different day.", 400);
  }
  const label = parseQuickLabelInput(input.label);
  const nutrients = parseQuickNutrientsInput(input);
  await db
    .insert(diaryEntries)
    .values({
      userId,
      mealId: meal.id,
      foodId: null,
      kind: "quick",
      label,
      date: isoDate,
      grams: QUICK_DIARY_ENTRY_GRAMS,
      nutrients,
      ...(input.id ? { id: input.id } : {}),
    })
    .onConflictDoNothing();
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

export async function stapleFoodsImported(db: Database, userId: string): Promise<boolean> {
  const [user] = await db
    .select({ staplesImportedAt: users.staplesImportedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.staplesImportedAt != null;
}

export async function importStapleFoods(db: Database, userId: string): Promise<{ imported: true; added: number }> {
  if (await stapleFoodsImported(db, userId)) {
    return { imported: true, added: 0 };
  }
  if (!(await nevoFoodsReady(db))) {
    throw new AppError("internal_error", "NEVO reference data is not loaded on this server yet.", 503);
  }

  const codes = [...STAPLE_NEVO_CODES];
  const rows = await db.select().from(nevoFoods).where(inArray(nevoFoods.nevoCode, codes));
  if (rows.length !== codes.length) {
    throw new AppError("not_found", "A staple food is missing from the NEVO reference data.", 404);
  }

  const existing = await db
    .select({ nevoCode: userFoods.nevoCode })
    .from(userFoods)
    .where(and(eq(userFoods.userId, userId), inArray(userFoods.nevoCode, codes)));
  const already = new Set(existing.map((row) => row.nevoCode));

  for (const row of rows) {
    await importNevoFood(db, userId, {
      nevoCode: row.nevoCode,
      name: nevoDisplayName(row.nameEn, row.nameNl),
      per100g: row.per100g as NutrientVector,
    });
  }

  await db.update(users).set({ staplesImportedAt: new Date() }).where(eq(users.id, userId));
  return { imported: true, added: rows.length - already.size };
}

export async function replaceStapleFoods(
  db: Database,
  userId: string,
): Promise<{ renamed: number; added: number }> {
  if (!(await nevoFoodsReady(db))) {
    throw new AppError("internal_error", "NEVO reference data is not loaded on this server yet.", 503);
  }

  const library = await db
    .select({ id: userFoods.id, name: userFoods.name, nevoCode: userFoods.nevoCode })
    .from(userFoods)
    .where(and(eq(userFoods.userId, userId), eq(userFoods.source, "nevo")));
  const codes = [...new Set(library.flatMap((food) => (food.nevoCode != null ? [food.nevoCode] : [])))];
  const references =
    codes.length === 0
      ? []
      : await db
          .select({ nevoCode: nevoFoods.nevoCode, nameEn: nevoFoods.nameEn })
          .from(nevoFoods)
          .where(inArray(nevoFoods.nevoCode, codes));
  const nameEnByCode = new Map(references.map((row) => [row.nevoCode, row.nameEn]));
  const changes = nevoEnglishRenames(library, nameEnByCode);
  for (const change of changes) {
    await db
      .update(userFoods)
      .set({ name: change.name, updatedAt: new Date() })
      .where(and(eq(userFoods.id, change.id), eq(userFoods.userId, userId)));
  }

  const stapleCodes = [...STAPLE_NEVO_CODES];
  const stapleRows = await db.select().from(nevoFoods).where(inArray(nevoFoods.nevoCode, stapleCodes));
  if (stapleRows.length !== stapleCodes.length) {
    throw new AppError("not_found", "A staple food is missing from the NEVO reference data.", 404);
  }
  const existing = await db
    .select({ nevoCode: userFoods.nevoCode })
    .from(userFoods)
    .where(and(eq(userFoods.userId, userId), inArray(userFoods.nevoCode, stapleCodes)));
  const already = new Set(existing.map((row) => row.nevoCode));
  let added = 0;
  for (const row of stapleRows) {
    if (already.has(row.nevoCode)) continue;
    await importNevoFood(db, userId, {
      nevoCode: row.nevoCode,
      name: nevoDisplayName(row.nameEn, row.nameNl),
      per100g: row.per100g as NutrientVector,
    });
    added += 1;
  }

  if (!(await stapleFoodsImported(db, userId))) {
    await db.update(users).set({ staplesImportedAt: new Date() }).where(eq(users.id, userId));
  }

  return { renamed: changes.length, added };
}
