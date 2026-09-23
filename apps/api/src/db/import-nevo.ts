import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDb } from "./client";
import { loadEnv } from "../config";
import { nevoSearchText, NEVO_DATA_VERSION, parseNevoCsv, type ParsedNevoFood } from "../nutrition/nevoParser";
import { countNevoFoods, replaceNevoFoods } from "../nutrition/nevoStore";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const bundledJson = path.join(apiRoot, "data/nevo/nevo2025-v9.0.json");

function toReferenceRows(foods: ParsedNevoFood[]) {
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

async function loadFoodsFromCsv(csvPath: string): Promise<ParsedNevoFood[]> {
  const text = await readFile(csvPath, "utf8");
  return parseNevoCsv(text);
}

async function loadFoodsFromBundledJson(): Promise<ParsedNevoFood[]> {
  const raw = await readFile(bundledJson, "utf8");
  const parsed = JSON.parse(raw) as ParsedNevoFood[];
  return parsed;
}

async function main() {
  const env = loadEnv();
  const db = createDb(env.databaseUrl);
  const csvPath = process.env.NEVO_CSV_PATH?.trim();
  const writeJson = process.env.NEVO_WRITE_JSON === "1";

  const foods = csvPath ? await loadFoodsFromCsv(csvPath) : await loadFoodsFromBundledJson();
  if (foods.length === 0) {
    throw new Error("No NEVO foods parsed. Check NEVO_CSV_PATH or bundled JSON.");
  }

  if (writeJson && csvPath) {
    const { writeFile, mkdir } = await import("node:fs/promises");
    await mkdir(path.dirname(bundledJson), { recursive: true });
    await writeFile(bundledJson, `${JSON.stringify(foods, null, 0)}\n`, "utf8");
    console.log(`Wrote ${foods.length} foods to ${bundledJson}`);
  }

  const inserted = await replaceNevoFoods(db, toReferenceRows(foods));
  const total = await countNevoFoods(db);
  console.log(`NEVO import complete: ${inserted} rows (${total} in database).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
