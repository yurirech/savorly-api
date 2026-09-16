import type { SavedRecipe } from "./recipe";

export type CookbookSummary = {
  id: string;
  userId: string;
  name: string;
  recipeCount: number;
  previewRecipes: SavedRecipe[];
  createdAt: string;
  updatedAt: string;
};

export type CookbookDetail = CookbookSummary & {
  recipes: SavedRecipe[];
};
