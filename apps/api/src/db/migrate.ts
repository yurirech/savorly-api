import postgres from "postgres";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const sqlFile = path.resolve(dir, "../../drizzle/0000_init.sql");
  const sql = await readFile(sqlFile, "utf8");
  const client = postgres(url, { max: 1 });
  await client.unsafe(sql);
  await client.end();
}

void main();
