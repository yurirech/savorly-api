import { eq, ilike, or, sql } from "drizzle-orm";
import type { NutrientVector, NevoFoodHit } from "@savorly/shared";
import type { Database } from "../db/client";
import { nevoFoods } from "../db/schema";
import { AppError } from "../errors";
import { NEVO_DATA_VERSION } from "./nevoParser";
import { rankNevoSearchHits } from "./nevoSearchRank";

export type NevoReferenceRow = {
  nevoCode: number;
  version: string;
  foodGroupNl: string;
  nameNl: string;
  nameEn: string;
  searchText: string;
  per100g: NutrientVector;
};

export async function countNevoFoods(db: Database): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(nevoFoods);
  return Number(row?.count ?? 0);
}

export async function replaceNevoFoods(db: Database, rows: NevoReferenceRow[]): Promise<number> {
  await db.delete(nevoFoods);
  const batchSize = 200;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const slice = rows.slice(offset, offset + batchSize);
    await db.insert(nevoFoods).values(
      slice.map((row) => ({
        nevoCode: row.nevoCode,
        version: row.version,
        foodGroupNl: row.foodGroupNl,
        nameNl: row.nameNl,
        nameEn: row.nameEn,
        searchText: row.searchText,
        per100g: row.per100g,
      })),
    );
  }
  return rows.length;
}

export async function searchNevoFoods(db: Database, query: string, limit = 20): Promise<NevoFoodHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const pattern = `%${trimmed.replaceAll("%", "").replaceAll("_", "")}%`;
  const candidateLimit = Math.max(limit * 10, 200);
  const rows = await db
    .select({
      nevoCode: nevoFoods.nevoCode,
      nameNl: nevoFoods.nameNl,
      nameEn: nevoFoods.nameEn,
      foodGroupNl: nevoFoods.foodGroupNl,
    })
    .from(nevoFoods)
    .where(or(ilike(nevoFoods.nameNl, pattern), ilike(nevoFoods.nameEn, pattern)))
    .orderBy(nevoFoods.nameNl)
    .limit(candidateLimit);

  const ranked = rankNevoSearchHits(rows, trimmed, limit);

  return ranked.map((row) => ({
    nevoCode: row.nevoCode,
    name: row.nameNl,
    nameEn: row.nameEn,
    foodGroup: row.foodGroupNl,
    version: NEVO_DATA_VERSION,
  }));
}

export async function getNevoFoodByCode(db: Database, nevoCode: number): Promise<NevoReferenceRow | null> {
  const [row] = await db.select().from(nevoFoods).where(eq(nevoFoods.nevoCode, nevoCode)).limit(1);
  if (!row) {
    return null;
  }
  return {
    nevoCode: row.nevoCode,
    version: row.version,
    foodGroupNl: row.foodGroupNl,
    nameNl: row.nameNl,
    nameEn: row.nameEn,
    searchText: row.searchText,
    per100g: row.per100g as NutrientVector,
  };
}

export async function requireNevoFood(db: Database, nevoCode: number): Promise<NevoReferenceRow> {
  const food = await getNevoFoodByCode(db, nevoCode);
  if (!food) {
    throw new AppError("not_found", "NEVO food not found. Run the NEVO import on the server.", 404);
  }
  return food;
}

export async function nevoFoodsReady(db: Database): Promise<boolean> {
  return (await countNevoFoods(db)) > 0;
}
