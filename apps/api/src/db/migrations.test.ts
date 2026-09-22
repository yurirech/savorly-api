import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MIGRATIONS } from "./migrations";

describe("MIGRATIONS", () => {
  it("runs every SQL file in drizzle/", () => {
    const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../drizzle");
    const files = readdirSync(dir)
      .filter((name) => name.endsWith(".sql"))
      .sort();
    expect([...MIGRATIONS]).toEqual(files);
  });
});
