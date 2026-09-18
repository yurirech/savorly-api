import { formatQuantity } from "./formatQuantity";
import { isConvertUnit, type ConvertUnit } from "./units";

export function formatCopyIngredientLine(ingredient: {
  quantity?: number | null;
  unit?: string | null;
  name: string;
  notes?: string | null;
}): string {
  const unit = ingredient.unit ?? "";
  const qty =
    ingredient.quantity != null && Number.isFinite(ingredient.quantity)
      ? formatQuantity(ingredient.quantity, isConvertUnit(unit) ? (unit as ConvertUnit) : unit)
      : "";
  if (!qty) {
    return ingredient.name;
  }
  return `${ingredient.name} ${qty}${unit}`;
}

export function formatRecipeIngredientsCopy(
  title: string,
  ingredients: Array<{
    quantity?: number | null;
    unit?: string | null;
    name: string;
    notes?: string | null;
  }>,
): string {
  return [title.trim(), ...ingredients.map(formatCopyIngredientLine)].join("\n");
}
