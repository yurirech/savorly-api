import { isConvertUnit, type ConvertUnit } from "./units";

const CUP_FRACTIONS = [
  { value: 0, label: "" },
  { value: 1 / 4, label: "1/4" },
  { value: 1 / 3, label: "1/3" },
  { value: 1 / 2, label: "1/2" },
  { value: 2 / 3, label: "2/3" },
  { value: 3 / 4, label: "3/4" },
  { value: 1, label: "1" },
] as const;

const SPOON_FRACTIONS = [
  { value: 0, label: "" },
  { value: 1 / 8, label: "1/8" },
  { value: 1 / 4, label: "1/4" },
  { value: 1 / 3, label: "1/3" },
  { value: 1 / 2, label: "1/2" },
  { value: 2 / 3, label: "2/3" },
  { value: 3 / 4, label: "3/4" },
  { value: 1, label: "1" },
] as const;

export function formatQuantity(quantity: number, unit: string | null | undefined): string {
  if (unit === "g") {
    if (quantity < 10) {
      const rounded = Math.round(quantity * 10) / 10;
      return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    }
    return String(Math.round(quantity));
  }
  if (unit === "cup") {
    return formatVolume(quantity, CUP_FRACTIONS);
  }
  if (unit === "tbsp" || unit === "tsp") {
    return formatVolume(quantity, SPOON_FRACTIONS);
  }
  const rounded = Math.round(quantity * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function formatVolume(
  quantity: number,
  fractions: readonly { value: number; label: string }[] = CUP_FRACTIONS,
): string {
  if (quantity <= 0) return "0";
  const whole = Math.floor(quantity + 1e-9);
  const frac = quantity - whole;
  let closest = fractions[0];
  let best = Infinity;
  for (const item of fractions) {
    const delta = Math.abs(frac - item.value);
    if (delta < best) {
      best = delta;
      closest = item;
    }
  }
  let wholePart = whole;
  let fracLabel = closest.label;
  if (closest.value === 1) {
    wholePart += 1;
    fracLabel = "";
  }
  if (!fracLabel) {
    return String(wholePart);
  }
  if (wholePart === 0) {
    return fracLabel;
  }
  return `${wholePart} ${fracLabel}`;
}

export function formatIngredientLine(ingredient: {
  quantity?: number | null;
  unit?: string | null;
  name: string;
  notes?: string | null;
}): string {
  const unit = ingredient.unit ?? null;
  const qty =
    ingredient.quantity != null && Number.isFinite(ingredient.quantity)
      ? formatQuantity(ingredient.quantity, isConvertUnit(unit) ? (unit as ConvertUnit) : unit)
      : "";
  const core = [qty, unit, ingredient.name].filter(Boolean).join(" ");
  return ingredient.notes ? `${core}, ${ingredient.notes}` : core;
}
