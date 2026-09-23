import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseNevoCsv } from "../nutrition/nevoParser";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultCsv = path.join(apiRoot, "data/nevo/NEVO2025_v9.0.csv");
const outJson = path.join(apiRoot, "data/nevo/nevo2025-v9.0.json");

async function main() {
  const csvPath = process.env.NEVO_CSV_PATH?.trim() || defaultCsv;
  const text = await readFile(csvPath, "utf8");
  const foods = parseNevoCsv(text);
  if (foods.length === 0) {
    throw new Error(`No foods parsed from ${csvPath}`);
  }
  await mkdir(path.dirname(outJson), { recursive: true });
  await writeFile(outJson, `${JSON.stringify(foods)}\n`, "utf8");
  console.log(`Wrote ${foods.length} foods to ${outJson}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
