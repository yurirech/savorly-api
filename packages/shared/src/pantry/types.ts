import type { GeneratedRecipe, Ingredient, SavedRecipe } from "../recipe";
import type { StarterPantryStaple } from "./starterStaples";
import type { QuickAddPantryAction } from "./quickAddPantry";

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

export type RecipePantryMatchReason = "canonical" | "dictionary" | "alias";

export type RecipePantryIngredientStatus = {
  index: number;
  name: string;
  matched: boolean;
  matchReason?: RecipePantryMatchReason;
  quantitySufficient?: boolean;
  quickAdd?: QuickAddPantryAction;
};

export type RecipePantryMatchResult = {
  isComplete: boolean;
  matchedCount: number;
  totalCount: number;
  missingIngredients: string[];
  ingredients: RecipePantryIngredientStatus[];
};

export type PantrySubstitutionLine = {
  originalIndex: number;
  originalName: string;
  pantryStapleLabel: string;
  replacement: Ingredient;
  rationale: string;
};

export type PantrySubstitutionResponse = {
  substitutions: PantrySubstitutionLine[];
  adaptSummary: string;
  adaptedRecipe: GeneratedRecipe;
};
