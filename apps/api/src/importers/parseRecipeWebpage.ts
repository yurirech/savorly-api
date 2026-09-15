import * as cheerio from "cheerio";

export type ParsedWebpage = {
  sourceName: string;
  jsonLd?: Record<string, unknown>;
  extractedText: string;
};

export function parseRecipeWebpage(html: string, pageUrl: string): ParsedWebpage {
  const $ = cheerio.load(html);
  const sourceName = hostnameOf(pageUrl);

  const jsonLd = findRecipeJsonLd($);
  $("script, style, noscript, iframe, nav, footer, header, aside, form").remove();
  $("[role='navigation'], .ad, .ads, .advert, .comments, #comments, .related").remove();

  const main = $("article, main, [itemtype*='Recipe'], .recipe, .entry-content").first();
  const root = main.length > 0 ? main : $("body");
  const extractedText = collapseWhitespace(root.text());

  return {
    sourceName,
    jsonLd,
    extractedText: extractedText.slice(0, 20_000),
  };
}

export function isCompleteRecipeJsonLd(value: Record<string, unknown> | undefined): boolean {
  if (!value) return false;
  const title = stringField(value.name) ?? stringField(value.headline);
  const ingredients = recipeIngredients(value);
  const instructions = recipeInstructions(value);
  return Boolean(title && ingredients.length > 0 && instructions.length > 0);
}

export function recipeIngredients(value: Record<string, unknown>): string[] {
  const raw = value.recipeIngredient ?? value.ingredients;
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item)).filter(Boolean);
  }
  if (typeof raw === "string") {
    return [raw];
  }
  return [];
}

export function recipeInstructions(value: Record<string, unknown>): string[] {
  const raw = value.recipeInstructions;
  if (typeof raw === "string") {
    return [raw];
  }
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((step) => {
      if (typeof step === "string") return step;
      if (step && typeof step === "object" && "text" in step) {
        return String((step as { text: unknown }).text);
      }
      return "";
    })
    .filter(Boolean);
}

function findRecipeJsonLd($: cheerio.CheerioAPI): Record<string, unknown> | undefined {
  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const script of scripts) {
    const raw = $(script).text();
    try {
      const parsed: unknown = JSON.parse(raw);
      const recipe = findRecipeNode(parsed);
      if (recipe) {
        return recipe;
      }
    } catch {
      // Invalid JSON-LD is ignored; readable extract is the fallback.
    }
  }
  return undefined;
}

function findRecipeNode(value: unknown): Record<string, unknown> | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (record["@graph"]) {
    return findRecipeNode(record["@graph"]);
  }
  if (isRecipeType(record["@type"])) {
    return record;
  }
  return undefined;
}

function isRecipeType(value: unknown): boolean {
  if (typeof value === "string") {
    return value.split("/").pop()?.toLowerCase() === "recipe";
  }
  if (Array.isArray(value)) {
    return value.some(isRecipeType);
  }
  return false;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "website";
  }
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
