export type ImportedRecipeSource = {
  sourceType: "instagram" | "website" | "text";
  originalUrl?: string;
  sourceName?: string;
  author?: string;
  caption?: string;
  transcript?: string;
  originalText?: string;
  jsonLd?: Record<string, unknown>;
  extractedText: string;
};

export interface RecipeSourceImporter<TInput> {
  import(input: TInput): Promise<ImportedRecipeSource>;
}
