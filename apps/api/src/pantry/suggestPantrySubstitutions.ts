import {
  activePantryStapleCount,
  applyPantrySubstitutions,
  buildPantryMatchIndex,
  displayIngredient,
  evaluateRecipePantryMatch,
  formatCopyIngredientLine,
  isIngredientSection,
  type Ingredient,
  type PantrySubstitutionLine,
  type PantrySubstitutionResponse,
  type SavedRecipe,
} from "@savorly/shared";
import type { Env } from "../config";
import type { Database } from "../db/client";
import { AppError } from "../errors";
import { resolveIngredients } from "../ingredients/resolveIngredients";
import { GEMINI_PANTRY_SUBSTITUTION_SCHEMA, generateGeminiJson } from "../normalize/geminiRecipeSchema";
import { getPantry } from "./pantryStore";
import { mockPantrySubstitutions, savedRecipeToGenerated } from "./mockPantrySubstitutions";
import { getRecipe } from "../recipes/recipeStore";

export type PantrySubstitutionsBody = {
  displayServings?: number;
};

const SYSTEM_INSTRUCTION = `You suggest practical cooking substitutions using ONLY items from the user's pantry list.
Adjust quantities when swapping (liquids vs solids, fat content, leavening) — do not use naive 1:1 swaps when chemistry differs.
Every replacement.name must be a pantry staple label or a clear subset of allowed pantry aliases.
Do not invent ingredients outside the pantry catalog.`;

export function parsePantrySubstitutionsFromGemini(
  raw: unknown,
  recipe: SavedRecipe,
  allowedMissingIndices: Set<number>,
): { adaptSummary: string; substitutions: PantrySubstitutionLine[] } {
  if (!raw || typeof raw !== "object") {
    throw new AppError("normalizer_failed", "Could not parse pantry substitutions.", 502);
  }

  const value = raw as Record<string, unknown>;
  const adaptSummary =
    typeof value.adaptSummary === "string" && value.adaptSummary.trim()
      ? value.adaptSummary.trim()
      : "Pantry substitutions suggested.";

  if (!Array.isArray(value.substitutions)) {
    throw new AppError("normalizer_failed", "Could not parse pantry substitutions.", 502);
  }

  const substitutions: PantrySubstitutionLine[] = [];
  for (const entry of value.substitutions) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const row = entry as Record<string, unknown>;
    const originalIngredientIndex = row.originalIngredientIndex;
    if (typeof originalIngredientIndex !== "number" || !Number.isInteger(originalIngredientIndex)) {
      throw new AppError("normalizer_failed", "Invalid substitution index from model.", 502);
    }
    if (!allowedMissingIndices.has(originalIngredientIndex)) {
      throw new AppError("normalizer_failed", "Substitution index does not match a missing ingredient.", 502);
    }

    const replacementRaw = row.replacement;
    if (!replacementRaw || typeof replacementRaw !== "object") {
      throw new AppError("normalizer_failed", "Invalid replacement ingredient from model.", 502);
    }
    const replacementObj = replacementRaw as Record<string, unknown>;
    if (typeof replacementObj.name !== "string" || !replacementObj.name.trim()) {
      throw new AppError("normalizer_failed", "Invalid replacement ingredient from model.", 502);
    }

    const replacement: Ingredient = {
      name: replacementObj.name.trim(),
      quantity: nullableNumber(replacementObj.quantity),
      unit: typeof replacementObj.unit === "string" ? replacementObj.unit : null,
      notes: typeof replacementObj.notes === "string" ? replacementObj.notes : null,
    };

    const original = recipe.ingredients[originalIngredientIndex];
    const originalName = original?.name.trim() || "ingredient";
    const pantryStapleLabel =
      typeof row.pantryStapleLabel === "string" && row.pantryStapleLabel.trim()
        ? row.pantryStapleLabel.trim()
        : replacement.name;
    const rationale =
      typeof row.rationale === "string" && row.rationale.trim() ? row.rationale.trim() : "Pantry swap";

    substitutions.push({
      originalIndex: originalIngredientIndex,
      originalName,
      pantryStapleLabel,
      replacement,
      rationale,
    });
  }

  if (substitutions.length === 0) {
    throw new AppError("normalizer_failed", "No pantry substitutions were returned.", 502);
  }

  return { adaptSummary, substitutions };
}

export async function suggestPantrySubstitutions(
  db: Database,
  userId: string,
  recipeId: string,
  body: PantrySubstitutionsBody,
  env: Env,
): Promise<PantrySubstitutionResponse> {
  const recipe = await getRecipe(db, userId, recipeId);
  const pantry = await getPantry(db, userId);
  const activeStapleCount = activePantryStapleCount(pantry);
  if (activeStapleCount === 0) {
    throw new AppError("validation_error", "Add staples to your pantry first.", 400);
  }

  const index = buildPantryMatchIndex(pantry);
  const match = evaluateRecipePantryMatch(recipe, index);
  if (match.isComplete) {
    throw new AppError("validation_error", "You already have every ingredient in your pantry for this recipe.", 400);
  }

  if (env.useMockImports || !env.geminiApiKey) {
    if (!env.useMockImports && !env.geminiApiKey) {
      throw new AppError("normalizer_failed", "GEMINI_API_KEY is not configured.", 500);
    }
    const mock = mockPantrySubstitutions(recipe, match, pantry);
    const resolved = await resolveIngredients(mock.adaptedRecipe, { env, db });
    return { ...mock, adaptedRecipe: resolved };
  }

  const displayServings = body.displayServings ?? recipe.servings ?? undefined;
  const userPrompt = buildPantrySubstitutionPrompt(recipe, match, pantry, displayServings);
  const raw = await generateGeminiJson({
    apiKey: env.geminiApiKey,
    model: env.geminiModel,
    systemInstruction: SYSTEM_INSTRUCTION,
    userPrompt,
    temperature: 0.35,
    offerTextPaste: false,
    failureMessage: "Could not suggest pantry substitutions. Try again.",
    responseSchema: GEMINI_PANTRY_SUBSTITUTION_SCHEMA,
  });

  const missingIndices = new Set(match.ingredients.filter((row) => !row.matched).map((row) => row.index));
  const parsed = parsePantrySubstitutionsFromGemini(raw, recipe, missingIndices);
  let adaptedRecipe = applyPantrySubstitutions(savedRecipeToGenerated(recipe), parsed.substitutions);
  adaptedRecipe = await resolveIngredients(adaptedRecipe, { env, db });

  return {
    substitutions: parsed.substitutions,
    adaptSummary: parsed.adaptSummary,
    adaptedRecipe,
  };
}

function buildPantrySubstitutionPrompt(
  recipe: SavedRecipe,
  match: ReturnType<typeof evaluateRecipePantryMatch>,
  pantry: Awaited<ReturnType<typeof getPantry>>,
  displayServings?: number,
): string {
  const servingsForMath = displayServings ?? recipe.servings ?? 1;
  const missingLines = match.ingredients
    .filter((row) => !row.matched)
    .map((row) => {
      const ingredient = recipe.ingredients[row.index];
      if (!ingredient || isIngredientSection(ingredient)) {
        return null;
      }
      const scaled = displayIngredient(ingredient, {
        originalServings: recipe.servings,
        displayServings: servingsForMath,
        displayUnit: "original",
      });
      return `${row.index}: ${formatCopyIngredientLine(scaled)}`;
    })
    .filter((line): line is string => Boolean(line));

  const pantryLines: string[] = [];
  for (const starter of pantry.starters) {
    if (!starter.inPantry) {
      continue;
    }
    pantryLines.push(`${starter.defaultName} — aliases: ${starter.defaultAliases.join(", ")}`);
  }
  for (const item of pantry.items) {
    pantryLines.push(`${item.displayName} — aliases: ${item.aliases.join(", ")}`);
  }

  return [
    `Recipe: ${recipe.title}`,
    `Category: ${recipe.category}`,
    `Servings for ingredient amounts: ${servingsForMath}`,
    "",
    "Missing ingredients (use originalIngredientIndex exactly as listed):",
    ...missingLines,
    "",
    "Pantry staples you MAY use (only these):",
    ...pantryLines,
    "",
    "Return substitutions for as many missing items as you can cover from the pantry. Skip items with no reasonable pantry match.",
  ].join("\n");
}

function nullableNumber(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}
