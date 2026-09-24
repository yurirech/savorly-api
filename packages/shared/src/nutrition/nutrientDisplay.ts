import { OPTIONAL_NUTRIENT_KEYS, roundNutrition, type NutrientVector } from "./nutrients";

export type NutrientDisplayUnit = "g" | "mg" | "mcg";

export type NutrientFieldMeta = {
  key: (typeof OPTIONAL_NUTRIENT_KEYS)[number];
  labelKey: string;
  unit: NutrientDisplayUnit;
};

export type NutrientDisplayGroup = {
  id: string;
  labelKey: string;
  fields: NutrientFieldMeta[];
};

export type PresentNutrientRow = NutrientFieldMeta & {
  value: number;
};

export type PresentNutrientGroup = {
  id: string;
  labelKey: string;
  rows: PresentNutrientRow[];
};

export const NUTRIENT_DISPLAY_GROUPS: NutrientDisplayGroup[] = [
  {
    id: "fats_carbs",
    labelKey: "Fats & carbohydrates",
    fields: [
      { key: "saturatedFatG", labelKey: "Saturated fat", unit: "g" },
      { key: "monoFatG", labelKey: "Monounsaturated fat", unit: "g" },
      { key: "transFatG", labelKey: "Trans fat", unit: "g" },
      { key: "omega3G", labelKey: "Omega-3", unit: "g" },
      { key: "omega6G", labelKey: "Omega-6", unit: "g" },
      { key: "fiberG", labelKey: "Fiber", unit: "g" },
      { key: "sugarsG", labelKey: "Sugars", unit: "g" },
      { key: "freeSugarsG", labelKey: "Free sugars", unit: "g" },
      { key: "starchG", labelKey: "Starch", unit: "g" },
      { key: "cholesterolMg", labelKey: "Cholesterol", unit: "mg" },
      { key: "alcoholG", labelKey: "Alcohol", unit: "g" },
    ],
  },
  {
    id: "minerals",
    labelKey: "Minerals",
    fields: [
      { key: "sodiumMg", labelKey: "Sodium", unit: "mg" },
      { key: "potassiumMg", labelKey: "Potassium", unit: "mg" },
      { key: "calciumMg", labelKey: "Calcium", unit: "mg" },
      { key: "phosphorusMg", labelKey: "Phosphorus", unit: "mg" },
      { key: "magnesiumMg", labelKey: "Magnesium", unit: "mg" },
      { key: "ironMg", labelKey: "Iron", unit: "mg" },
      { key: "zincMg", labelKey: "Zinc", unit: "mg" },
      { key: "copperMg", labelKey: "Copper", unit: "mg" },
      { key: "seleniumMcg", labelKey: "Selenium", unit: "mcg" },
      { key: "iodineMcg", labelKey: "Iodine", unit: "mcg" },
    ],
  },
  {
    id: "vitamins",
    labelKey: "Vitamins",
    fields: [
      { key: "vitaminAMcgRae", labelKey: "Vitamin A", unit: "mcg" },
      { key: "vitaminDMcg", labelKey: "Vitamin D", unit: "mcg" },
      { key: "vitaminEMg", labelKey: "Vitamin E", unit: "mg" },
      { key: "vitaminKMcg", labelKey: "Vitamin K", unit: "mcg" },
      { key: "vitaminCMg", labelKey: "Vitamin C", unit: "mg" },
      { key: "thiaminMg", labelKey: "Thiamin (B1)", unit: "mg" },
      { key: "riboflavinMg", labelKey: "Riboflavin (B2)", unit: "mg" },
      { key: "vitaminB6Mg", labelKey: "Vitamin B6", unit: "mg" },
      { key: "vitaminB12Mcg", labelKey: "Vitamin B12", unit: "mcg" },
      { key: "niacinMg", labelKey: "Niacin", unit: "mg" },
      { key: "folateMcg", labelKey: "Folate", unit: "mcg" },
    ],
  },
];

export function formatNutrientAmount(value: number, unit: NutrientDisplayUnit): string {
  const rounded = roundNutrition(value);
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  const unitLabel = unit === "mcg" ? "µg" : unit;
  return `${text} ${unitLabel}`;
}

export function listPresentNutrients(per100g: NutrientVector): PresentNutrientGroup[] {
  const groups: PresentNutrientGroup[] = [];

  for (const group of NUTRIENT_DISPLAY_GROUPS) {
    const rows: PresentNutrientRow[] = [];
    for (const field of group.fields) {
      const value = per100g[field.key];
      if (value == null) {
        continue;
      }
      rows.push({ ...field, value });
    }
    if (rows.length > 0) {
      groups.push({ id: group.id, labelKey: group.labelKey, rows });
    }
  }

  return groups;
}
