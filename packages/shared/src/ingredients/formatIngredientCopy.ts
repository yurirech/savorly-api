import { ingredientSectionTitle, isIngredientSection } from "../recipe";
import { formatQuantity } from "./formatQuantity";
import { isConvertUnit, type ConvertUnit } from "./units";

export function formatCopyIngredientLine(ingredient: {
  quantity?: number | null;
  unit?: string | null;
  name: string;
  notes?: string | null;
  lineKind?: "ingredient" | "section";
}): string {
  if (isIngredientSection(ingredient)) {
    const title = ingredientSectionTitle(ingredient);
    return title ? `${title}:` : ingredient.name;
  }
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
    lineKind?: "ingredient" | "section";
  }>,
): string {
  return [title.trim(), ...ingredients.map(formatCopyIngredientLine)].join("\n");
}
