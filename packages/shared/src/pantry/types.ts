import type { SavedRecipe } from "../recipe";
import type { StarterPantryStaple } from "./starterStaples";

export type UserPantryItem = {
  id: string;
  starterKey: string | null;
  displayName: string;
  aliases: string[];
  createdAt: string;
  updatedAt: string;
};

export type PantryStarterView = StarterPantryStaple & {
  inPantry: boolean;
};

export type PantryResponse = {
  starters: PantryStarterView[];
  items: UserPantryItem[];
};

export type MealSuggestion = {
  recipe: SavedRecipe;
  matchedCount: number;
  totalCount: number;
  matchedIngredients: string[];
  missingIngredients: string[];
};

export type MealSuggestionResponse = {
  suggestion: MealSuggestion | null;
  rankedTotal: number;
  activeStapleCount: number;
};
