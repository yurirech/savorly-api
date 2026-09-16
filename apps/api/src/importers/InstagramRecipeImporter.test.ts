import { describe, expect, it } from "vitest";
import { AppError } from "../errors";
import { InstagramRecipeImporter, instagramReelActorInput } from "./InstagramRecipeImporter";

describe("InstagramRecipeImporter", () => {
  it("rejects non-Instagram URLs before calling Apify", async () => {
    const importer = new InstagramRecipeImporter("token", "actor");
    await expect(importer.import({ url: "https://example.com/reel/1" })).rejects.toBeInstanceOf(AppError);
  });

  it("rejects Instagram profile URLs", async () => {
    const importer = new InstagramRecipeImporter("token", "actor");
    await expect(importer.import({ url: "https://www.instagram.com/humansofny/" })).rejects.toMatchObject({
      code: "validation_error",
    });
  });

  it("sends the Reel URL in username, which the Apify actor requires", () => {
    const url = new URL("https://www.instagram.com/reel/DE7nUBBRP9-/?hl=en");
    expect(instagramReelActorInput(url)).toEqual({
      username: ["https://www.instagram.com/reel/DE7nUBBRP9-/?hl=en"],
      resultsLimit: 1,
    });
  });
});
