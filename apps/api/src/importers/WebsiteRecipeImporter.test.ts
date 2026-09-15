import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../errors";
import { fetchPublicHttpUrl } from "./ssrfFetch";
import { WebsiteRecipeImporter } from "./WebsiteRecipeImporter";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WebsiteRecipeImporter", () => {
  it("uses JSON-LD Recipe as the primary extract", async () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      "@type": "Recipe",
      name: "Lemon pasta",
      recipeIngredient: ["pasta", "lemon"],
      recipeInstructions: ["Boil and toss."],
    })}</script></head><body><nav>Ads</nav></html>`;

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(html, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      ),
    );

    const imported = await new WebsiteRecipeImporter().import({ url: "https://example.com/lemon" });
    expect(imported.sourceName).toBe("example.com");
    expect(imported.originalUrl).toContain("example.com");
    expect(imported.extractedText).toContain("Lemon pasta");
    expect(imported.jsonLd?.name).toBe("Lemon pasta");
  });

  it("offers paste when the site blocks retrieval", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 403, headers: { "content-type": "text/html" } })),
    );

    await expect(new WebsiteRecipeImporter().import({ url: "https://example.com/secret" })).rejects.toMatchObject({
      code: "import_blocked",
      offerTextPaste: true,
    } satisfies Partial<AppError>);
  });
});

describe("fetchPublicHttpUrl redirects", () => {
  it("rejects a redirect to a private host", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(null, {
          status: 302,
          headers: { location: "http://127.0.0.1/internal" },
        }),
      ),
    );

    await expect(fetchPublicHttpUrl("https://example.com/go")).rejects.toBeInstanceOf(AppError);
  });
});
