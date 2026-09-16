export type RecipeImportRequest =
  | {
      type: "instagram";
      url: string;
    }
  | {
      type: "website";
      url: string;
    }
  | {
      type: "text";
      text: string;
      sourceName?: string;
    };

export type RecipeSourceType = "instagram" | "website" | "text" | "manual";

export type RecipeSource = {
  type: RecipeSourceType;
  originalUrl?: string;
  sourceName?: string;
  author?: string;
  caption?: string;
  transcript?: string;
  originalText?: string;
};

export type Ingredient = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
};

export type RecipeStep = {
  order: number;
  text: string;
  durationMinutes?: number | null;
  temperatureC?: number | null;
};

export type GeneratedRecipe = {
  title: string;
  category: import("./foodCategory").FoodCategory;
  servings?: number | null;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  tags: string[];
  notes?: string | null;
  uncertainties: string[];
  source: RecipeSource;
};

export type SavedRecipe = GeneratedRecipe & {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type RecipeSearchQuery = {
  q?: string;
  category?: import("./foodCategory").FoodCategory;
};

export type CreateAgent = "creami" | "bread" | "bake" | "chef";

export type CreamiGenerateRequest = {
  agent: "creami";
  size: "big" | "small";
  macros: "lean" | "balanced";
  base: "lean" | "mixed";
  texture: "gelato" | "standard";
  sweetener: "stevia" | "sucralose" | "both";
  flavor?: string;
  notes?: string;
  previousRecipe?: GeneratedRecipe;
  adaptNote?: string;
};

export type NotesGenerateRequest = {
  agent: "bread" | "bake" | "chef";
  notes: string;
  previousRecipe?: GeneratedRecipe;
  adaptNote?: string;
};

export type RecipeGenerateRequest = CreamiGenerateRequest | NotesGenerateRequest;
