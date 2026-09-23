import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Database } from "../db/client";
import { nevoSearchText, NEVO_DATA_VERSION, type ParsedNevoFood } from "./nevoParser";
import { countNevoFoods, replaceNevoFoods } from "./nevoStore";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const bundledJson = path.join(apiRoot, "data/nevo/nevo2025-v9.0.json");

async function loadBundledFoods(): Promise<ParsedNevoFood[]> {
  const raw = await readFile(bundledJson, "utf8");
  return JSON.parse(raw) as ParsedNevoFood[];
}

export async function seedNevoReferenceIfEmpty(db: Database): Promise<number> {
  if ((await countNevoFoods(db)) > 0) {
    return 0;
  }

  const foods = await loadBundledFoods();
  if (foods.length === 0) {
    return 0;
  }

  return replaceNevoFoods(
    db,
    foods.map((food) => ({
      nevoCode: food.nevoCode,
      version: NEVO_DATA_VERSION,
      foodGroupNl: food.foodGroupNl,
      nameNl: food.nameNl,
      nameEn: food.nameEn,
      searchText: nevoSearchText(food),
      per100g: food.per100g,
    })),
  );
}
