import type { NutrientVector } from "@savorly/shared";

export const NEVO_NUTRIENT_COLUMNS: {
  headerIncludes: string;
  field: Exclude<keyof NutrientVector, "kcal" | "proteinG" | "carbsG" | "fatG">;
}[] = [
  { headerIncludes: "FASAT (g)", field: "saturatedFatG" },
  { headerIncludes: "FIBT (g)", field: "fiberG" },
  { headerIncludes: "FAPUN3 (g)", field: "omega3G" },
  { headerIncludes: "FAPUN6 (g)", field: "omega6G" },
  { headerIncludes: "FATRS (g)", field: "transFatG" },
  { headerIncludes: "FAMSCIS (g)", field: "monoFatG" },
  { headerIncludes: "SUGAR (g)", field: "sugarsG" },
  { headerIncludes: "NVSUGAF (g)", field: "freeSugarsG" },
  { headerIncludes: "STARCH (g)", field: "starchG" },
  { headerIncludes: "CHORL (mg)", field: "cholesterolMg" },
  { headerIncludes: "ALC (g)", field: "alcoholG" },
  { headerIncludes: "NA (mg)", field: "sodiumMg" },
  { headerIncludes: "K (mg)", field: "potassiumMg" },
  { headerIncludes: "CA (mg)", field: "calciumMg" },
  { headerIncludes: "P (mg)", field: "phosphorusMg" },
  { headerIncludes: "MG (mg)", field: "magnesiumMg" },
  { headerIncludes: "FE (mg)", field: "ironMg" },
  { headerIncludes: "ZN (mg)", field: "zincMg" },
  { headerIncludes: "CU (mg)", field: "copperMg" },
  { headerIncludes: "SE (", field: "seleniumMcg" },
  { headerIncludes: "ID (", field: "iodineMcg" },
  { headerIncludes: "VITA_RAE (", field: "vitaminAMcgRae" },
  { headerIncludes: "VITD (", field: "vitaminDMcg" },
  { headerIncludes: "VITE (mg)", field: "vitaminEMg" },
  { headerIncludes: "VITK (", field: "vitaminKMcg" },
  { headerIncludes: "VITC (mg)", field: "vitaminCMg" },
  { headerIncludes: "THIA (mg)", field: "thiaminMg" },
  { headerIncludes: "RIBF (mg)", field: "riboflavinMg" },
  { headerIncludes: "VITB6 (mg)", field: "vitaminB6Mg" },
  { headerIncludes: "VITB12 (", field: "vitaminB12Mcg" },
  { headerIncludes: "NIAEQ (mg)", field: "niacinMg" },
  { headerIncludes: "FOL (", field: "folateMcg" },
];
