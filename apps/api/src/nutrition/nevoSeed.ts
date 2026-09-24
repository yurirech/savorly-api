import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasExtendedNutrients } from "@savorly/shared";
import type { Database } from "../db/client";
import { nevoSearchText, NEVO_DATA_VERSION, type ParsedNevoFood } from "./nevoParser";
import { countNevoFoods, getNevoFoodByCode, replaceNevoFoods, type NevoReferenceRow } from "./nevoStore";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const bundledJson = path.join(apiRoot, "data/nevo/nevo2025-v9.0.json");
const NEVO_SYNC_PROBE_CODE = 286;

async function loadBundledFoods(): Promise<ParsedNevoFood[]> {
  const raw = await readFile(bundledJson, "utf8");
  return JSON.parse(raw) as ParsedNevoFood[];
}

function toReferenceRows(foods: ParsedNevoFood[]): NevoReferenceRow[] {
  return foods.map((food) => ({
    nevoCode: food.nevoCode,
    version: NEVO_DATA_VERSION,
    foodGroupNl: food.foodGroupNl,
    nameNl: food.nameNl,
    nameEn: food.nameEn,
    searchText: nevoSearchText(food),
    per100g: food.per100g,
  }));
}

async function referenceNeedsMicronutrientResync(db: Database, bundledFoods: ParsedNevoFood[]): Promise<boolean> {
  const bundledProbe = bundledFoods.find((food) => food.nevoCode === NEVO_SYNC_PROBE_CODE);
  if (!bundledProbe || !hasExtendedNutrients(bundledProbe.per100g)) {
    return false;
  }

  const liveProbe = await getNevoFoodByCode(db, NEVO_SYNC_PROBE_CODE);
  if (!liveProbe) {
    return true;
  }

  return !hasExtendedNutrients(liveProbe.per100g);
}

export async function ensureNevoReferenceSynced(db: Database): Promise<number> {
  const foods = await loadBundledFoods();
  if (foods.length === 0) {
    return 0;
  }

  const rows = toReferenceRows(foods);
  const count = await countNevoFoods(db);
  if (count === 0) {
    return replaceNevoFoods(db, rows);
  }

  if (!(await referenceNeedsMicronutrientResync(db, foods))) {
    return 0;
  }

  return replaceNevoFoods(db, rows);
}

/** @deprecated Use ensureNevoReferenceSynced */
export async function seedNevoReferenceIfEmpty(db: Database): Promise<number> {
  return ensureNevoReferenceSynced(db);
}
