import postgres from "postgres";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS = ["0000_init.sql", "0001_cookbooks.sql"];

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
}

void main();
