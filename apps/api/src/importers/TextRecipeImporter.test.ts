import { describe, expect, it } from "vitest";
import { AppError } from "../errors";
import { TextRecipeImporter } from "./TextRecipeImporter";
import { assertPublicHost } from "./ssrfFetch";

describe("TextRecipeImporter", () => {
  it("keeps pasted text as originalText", async () => {
    const imported = await new TextRecipeImporter().import({
      text: "Informal notes: pasta, garlic, maybe some chili if you have it.",
      sourceName: "Phone notes",
    });
    expect(imported.sourceType).toBe("text");
    expect(imported.originalText).toContain("pasta");
    expect(imported.sourceName).toBe("Phone notes");
  });

  it("rejects tiny pastes", async () => {
    await expect(new TextRecipeImporter().import({ text: "hi" })).rejects.toBeInstanceOf(AppError);
  });
});

describe("assertPublicHost", () => {
  it("rejects localhost without resolving", async () => {
    await expect(assertPublicHost(new URL("http://localhost/admin"))).rejects.toBeInstanceOf(AppError);
    await expect(assertPublicHost(new URL("http://metadata.google.internal/"))).rejects.toBeInstanceOf(AppError);
  });
});
