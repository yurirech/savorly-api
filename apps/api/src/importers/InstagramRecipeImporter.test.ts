import { describe, expect, it } from "vitest";
import { AppError } from "../errors";
import { InstagramRecipeImporter } from "./InstagramRecipeImporter";

describe("InstagramRecipeImporter", () => {
  it("rejects non-Instagram URLs before calling Apify", async () => {
    const importer = new InstagramRecipeImporter("token", "actor");
    await expect(importer.import({ url: "https://example.com/reel/1" })).rejects.toBeInstanceOf(AppError);
  });
});
