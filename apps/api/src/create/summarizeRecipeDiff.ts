import type { GeneratedRecipe, Ingredient, RecipeMacros } from "@savorly/shared";

export function summarizeRecipeDiff(before: GeneratedRecipe, after: GeneratedRecipe): string {
  const lines: string[] = [];

  for (const line of diffIngredients(before.ingredients, after.ingredients)) {
    lines.push(line);
  }

  const macroLine = diffMacros(before.nutrition?.perServing, after.nutrition?.perServing);
  if (macroLine) {
    lines.push(macroLine);
  }

  if (lines.length === 0) {
    return "Changes: updated the recipe to match your request.";
  }

  return `Changes: ${lines.join(" ")}`;
}

function diffIngredients(before: Ingredient[], after: Ingredient[]): string[] {
  const beforeByKey = indexIngredients(before);
  const afterByKey = indexIngredients(after);
  const lines: string[] = [];

  for (const [key, ingredient] of afterByKey) {
    if (!beforeByKey.has(key)) {
      lines.push(`Added ${formatIngredientBrief(ingredient)}.`);
    }
  }

  for (const [key, ingredient] of beforeByKey) {
    if (!afterByKey.has(key)) {
      lines.push(`Removed ${ingredient.name}.`);
    }
  }

  for (const [key, next] of afterByKey) {
    const prev = beforeByKey.get(key);
    if (!prev) {
      continue;
    }
    const prevQty = formatQuantity(prev);
    const nextQty = formatQuantity(next);
    if (prevQty !== nextQty) {
      lines.push(`${next.name}: ${prevQty} → ${nextQty}.`);
    }
  }

  return lines;
}

function indexIngredients(ingredients: Ingredient[]): Map<string, Ingredient> {
  const map = new Map<string, Ingredient>();
  for (const ingredient of ingredients) {
    map.set(normalizeName(ingredient.name), ingredient);
  }
  return map;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function formatIngredientBrief(ingredient: Ingredient): string {
  const qty = formatQuantity(ingredient);
  return qty === "—" ? ingredient.name : `${ingredient.name} (${qty})`;
}

function formatQuantity(ingredient: Ingredient): string {
  if (ingredient.quantity == null) {
    return "—";
  }
  const unit = ingredient.unit?.trim() || "g";
  return `${ingredient.quantity} ${unit}`;
}

function diffMacros(before?: RecipeMacros | null, after?: RecipeMacros | null): string | null {
  if (!before || !after) {
    return null;
  }
  const parts: string[] = [];
  if (Math.abs(before.fatG - after.fatG) >= 0.5) {
    parts.push(`fat ${before.fatG}g → ${after.fatG}g per serving`);
  }
  if (Math.abs(before.kcal - after.kcal) >= 5) {
    parts.push(`calories ${before.kcal} → ${after.kcal} per serving`);
  }
  if (Math.abs(before.proteinG - after.proteinG) >= 0.5) {
    parts.push(`protein ${before.proteinG}g → ${after.proteinG}g per serving`);
  }
  if (parts.length === 0) {
    return null;
  }
  return `Per serving: ${parts.join("; ")}.`;
}
