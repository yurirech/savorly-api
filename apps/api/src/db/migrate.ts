import postgres from "postgres";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MIGRATIONS } from "./migrations";
import { createDb } from "./client";
import { ensureNevoReferenceSynced } from "../nutrition/nevoSeed";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const drizzleDir = path.resolve(dir, "../../drizzle");
  const client = postgres(url, { max: 1 });
  for (const file of MIGRATIONS) {
    const sql = await readFile(path.join(drizzleDir, file), "utf8");
    await client.unsafe(sql);
  }
  await client.end();

  const db = createDb(url);
  const synced = await ensureNevoReferenceSynced(db);
  if (synced > 0) {
    console.log(`Synced ${synced} NEVO reference foods from bundled JSON.`);
  }
}

void main();
