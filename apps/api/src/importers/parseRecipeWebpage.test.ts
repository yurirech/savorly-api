import { describe, expect, it } from "vitest";
import { isCompleteRecipeJsonLd, parseRecipeWebpage } from "./parseRecipeWebpage";

const jsonLdPage = `
<html>
  <head>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Recipe",
        "name": "Lemon pasta",
        "recipeIngredient": ["200g pasta", "1 lemon"],
        "recipeInstructions": [{ "@type": "HowToStep", "text": "Boil pasta and toss with lemon." }]
      }
    </script>
  </head>
  <body>
    <nav>Home About Ads</nav>
    <article>Ignore this if JSON-LD is complete.</article>
  </body>
</html>
`;

const messyPage = `
<html>
  <body>
    <nav>Buy now</nav>
    <div class="ad">Sponsored</div>
    <article class="recipe">
      <h1>Garlic rice</h1>
      <p>Rice, garlic, oil. Steam until tender.</p>
    </article>
    <section class="comments">I hated this</section>
  </body>
</html>
`;

describe("parseRecipeWebpage", () => {
  it("prefers schema.org Recipe JSON-LD", () => {
    const parsed = parseRecipeWebpage(jsonLdPage, "https://www.example.com/lemon-pasta");
    expect(parsed.sourceName).toBe("example.com");
    expect(isCompleteRecipeJsonLd(parsed.jsonLd)).toBe(true);
    expect(parsed.jsonLd?.name).toBe("Lemon pasta");
  });

  it("strips navigation, ads and comments from readable extract", () => {
    const parsed = parseRecipeWebpage(messyPage, "https://food.example.org/garlic-rice");
    expect(parsed.extractedText).toContain("Garlic rice");
    expect(parsed.extractedText).not.toContain("Sponsored");
    expect(parsed.extractedText).not.toContain("I hated this");
    expect(parsed.extractedText).not.toContain("Buy now");
  });
});
