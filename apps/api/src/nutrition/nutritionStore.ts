import { and, desc, eq, ilike, sql } from "drizzle-orm";
import {
  computeNutritionTargets,
  remainingMacros,
  scaleNutrition,
  sumNutrients,
  type DiaryDayResponse,
  type DiaryEntry,
  type NutrientVector,
  type NutritionProfile,
  type NutritionProfileInput,
  type NutritionProfileResponse,
  type UserFood,
  type UserFoodSource,
} from "@savorly/shared";
import type { Database } from "../db/client";
import { diaryEntries, nutritionProfiles, userFoods } from "../db/schema";
import { AppError } from "../errors";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type ProfileRow = typeof nutritionProfiles.$inferSelect;
type FoodRow = typeof userFoods.$inferSelect;
type DiaryRow = typeof diaryEntries.$inferSelect;

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

export function diaryFromRow(row: DiaryRow, foodName: string): DiaryEntry {
  return {
    id: row.id,
    date: asIsoDate(row.date),
    foodId: row.foodId,
    foodName,
    grams: row.grams,
    nutrients: requireNutrientVector(row.nutrients, "Diary nutrients"),
    createdAt: row.createdAt.toISOString(),
  };
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
    .where(eq(diaryEntries.foodId, food.id));
  if (Number(used?.count ?? 0) > 0) {
    throw new AppError("validation_error", "This food is used in the diary. Remove those entries first.", 400);
  }
  await db.delete(userFoods).where(and(eq(userFoods.id, food.id), eq(userFoods.userId, userId)));
}

export async function getDiaryDay(db: Database, userId: string, date: string): Promise<DiaryDayResponse> {
  const isoDate = parseIsoDate(date);
  const rows = await db
    .select({
      entry: diaryEntries,
      foodName: userFoods.name,
    })
    .from(diaryEntries)
    .innerJoin(userFoods, eq(userFoods.id, diaryEntries.foodId))
    .where(and(eq(diaryEntries.userId, userId), eq(diaryEntries.date, isoDate)))
    .orderBy(desc(diaryEntries.createdAt));

  const entries = rows.map((row) => diaryFromRow(row.entry, row.foodName));
  const totals = sumNutrients(entries.map((entry) => entry.nutrients));
  const profile = await getNutritionProfile(db, userId);
  return {
    date: isoDate,
    entries,
    totals,
    remaining: profile.targets ? remainingMacros(profile.targets, totals) : null,
    targets: profile.targets,
  };
}

export async function addDiaryEntry(
  db: Database,
  userId: string,
  input: { foodId: string; grams: number; date: string },
): Promise<DiaryDayResponse> {
  const isoDate = parseIsoDate(input.date);
  if (!(input.grams > 0) || input.grams > 5000) {
    throw new AppError("validation_error", "Grams must be between 0 and 5000.", 400);
  }
  const food = await getOwnedUserFood(db, userId, input.foodId);
  const nutrients = scaleNutrition(food.per100g, input.grams);
  await db.insert(diaryEntries).values({
    userId,
    foodId: food.id,
    date: isoDate,
    grams: input.grams,
    nutrients,
  });
  return getDiaryDay(db, userId, isoDate);
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
