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
  canonicalKey?: string | null;
  gramsPerCup?: number | null;
};

export type RecipeStep = {
  order: number;
  text: string;
  durationMinutes?: number | null;
  temperatureC?: number | null;
};

export type RecipeMacros = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type RecipeNutrition = {
  servingG: number;
  perServing: RecipeMacros;
  perPint?: RecipeMacros | null;
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
  nutrition?: RecipeNutrition | null;
  source: RecipeSource;
};

export type SavedRecipe = GeneratedRecipe & {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export function recipeNotesText(recipe: Pick<GeneratedRecipe, "notes" | "uncertainties">): string {
  return [recipe.notes, ...(recipe.uncertainties ?? [])]
    .map((item) => item?.trim() ?? "")
    .filter(Boolean)
    .join("\n");
}

export function isCreamiRecipe(recipe: Pick<GeneratedRecipe, "source" | "tags">): boolean {
  return recipe.source.sourceName === "Creami" || recipe.tags.some((tag) => tag.toLowerCase() === "creami");
}

export function isMixInIngredient(ingredient: Pick<Ingredient, "notes">): boolean {
  return /\bmix-?in\b/i.test(ingredient.notes ?? "");
}

export type RecipeSearchQuery = {
  q?: string;
  category?: import("./foodCategory").FoodCategory;
};

export type CreateAgent = "creami" | "bread" | "bake" | "chef";

export type CreamiSweetenerKind = "bulky" | "lightweight";

export type CreamiGenerateRequest = {
  agent: "creami";
  size: "big" | "small";
  macros: "lean" | "balanced";
  texture: "gelato" | "standard";
  sweetenerKind: CreamiSweetenerKind;
  sweetenerName?: string;
  flavor?: string;
  notes?: string;
  previousRecipe?: GeneratedRecipe;
  adaptNote?: string;
  adaptGoal?: string;
};

export type ChefMealType = "main" | "side" | "snack";
export type ChefStyle = "regular" | "lighter" | "nutritious";
export type ChefServings = 1 | 2 | 4;

export type ChefGenerateRequest = {
  agent: "chef";
  mealType: ChefMealType;
  servings: ChefServings;
  style: ChefStyle;
  notes?: string;
  previousRecipe?: GeneratedRecipe;
  adaptNote?: string;
  adaptGoal?: string;
};

export type BreadLoafSize = "medium" | "large";
export type BreadStyle = "regular" | "lighter";

export type BreadGenerateRequest = {
  agent: "bread";
  size: BreadLoafSize;
  style: BreadStyle;
  notes?: string;
  previousRecipe?: GeneratedRecipe;
  adaptNote?: string;
  adaptGoal?: string;
};

export type BakeKind = "cake" | "muffin" | "cupcake" | "other";
export type BakeStyle = "regular" | "lighter";

export type BakeGenerateRequest = {
  agent: "bake";
  kind: BakeKind;
  style: BakeStyle;
  notes?: string;
  previousRecipe?: GeneratedRecipe;
  adaptNote?: string;
  adaptGoal?: string;
};

export type RecipeGenerateRequest =
  | CreamiGenerateRequest
  | BreadGenerateRequest
  | BakeGenerateRequest
  | ChefGenerateRequest;
