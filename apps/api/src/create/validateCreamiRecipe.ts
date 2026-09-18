import {
  creamiPintFillG,
  creamiSugarG,
  creamiXanthanRangeG,
  CREAMI_FILL_TOLERANCE_G,
  foldAlias,
  isMixInIngredient,
  type CreamiGenerateRequest,
  type GeneratedRecipe,
  type Ingredient,
} from "@savorly/shared";

export function normalizeCreamiRecipe(
  recipe: GeneratedRecipe,
  request: CreamiGenerateRequest,
): GeneratedRecipe {
  const sugarG = creamiSugarG(request.size);
  const targetFillG = creamiPintFillG(request.size);
  const uncertainties = [...recipe.uncertainties];
  const ingredients = recipe.ingredients.map((ingredient) => ({ ...ingredient }));

  forceSugar(ingredients, sugarG);
  adjustSkimToFill(ingredients, targetFillG, uncertainties);
  addSoftChecks(ingredients, request.size, uncertainties);

  return {
    ...recipe,
    ingredients,
    uncertainties: uniqueNotes(uncertainties),
  };
}

function forceSugar(ingredients: Ingredient[], sugarG: number): void {
  const sugar = ingredients.find((ingredient) => !isMixInIngredient(ingredient) && isSugarIngredient(ingredient));
  if (sugar) {
    sugar.quantity = sugarG;
    sugar.unit = "g";
    return;
  }
  ingredients.push({
    name: "refined sugar",
    quantity: sugarG,
    unit: "g",
    notes: null,
    canonicalKey: null,
    gramsPerCup: null,
  });
}

function adjustSkimToFill(ingredients: Ingredient[], targetFillG: number, uncertainties: string[]): void {
  const sum = sumBaseGrams(ingredients, uncertainties);
  if (Math.abs(sum - targetFillG) <= CREAMI_FILL_TOLERANCE_G) return;

  const skim = ingredients.find((ingredient) => !isMixInIngredient(ingredient) && isSkimIngredient(ingredient));
  if (!skim || skim.quantity == null) {
    uncertainties.push("Pint fill is off and no skim milk line was found to adjust.");
    return;
  }

  const nextSkim = Math.max(0, roundToNearest5(skim.quantity + (targetFillG - sum)));
  skim.quantity = nextSkim;
  skim.unit = skim.unit ?? "g";

  const nextSum = sumBaseGrams(ingredients, []);
  if (Math.abs(nextSum - targetFillG) > CREAMI_FILL_TOLERANCE_G) {
    uncertainties.push(`Pint fill is still ${Math.round(nextSum)} g after adjusting skim (target ${targetFillG} g).`);
  }
}

function addSoftChecks(
  ingredients: Ingredient[],
  size: CreamiGenerateRequest["size"],
  uncertainties: string[],
): void {
  const base = ingredients.filter((ingredient) => !isMixInIngredient(ingredient));
  const xanthan = base.find(isXanthanIngredient);
  const range = creamiXanthanRangeG(size);
  if (xanthan?.quantity != null && (xanthan.quantity < range.min || xanthan.quantity > range.max)) {
    uncertainties.push(`Xanthan ${xanthan.quantity} g is outside ${range.min}–${range.max} g for this pint size.`);
  }

  const missing = [
    ["skim milk", base.some(isSkimIngredient)],
    ["quark or Greek yogurt", base.some(isQuarkIngredient)],
    ["whey", base.some(isWheyIngredient)],
    ["SMP", base.some(isSmpIngredient)],
    ["xanthan", base.some(isXanthanIngredient)],
    ["salt", base.some(isSaltIngredient)],
  ].filter(([, present]) => !present)
    .map(([name]) => name);

  if (missing.length > 0) {
    uncertainties.push(`Missing staple ingredients: ${missing.join(", ")}.`);
  }
}

function sumBaseGrams(ingredients: Ingredient[], uncertainties: string[]): number {
  return ingredients.reduce((total, ingredient) => {
    if (isMixInIngredient(ingredient)) return total;
    if (ingredient.quantity == null) {
      uncertainties.push(`Missing quantity for ${ingredient.name}.`);
      return total;
    }
    if (!isGramLikeUnit(ingredient.unit)) return total;
    return total + ingredient.quantity;
  }, 0);
}

function isGramLikeUnit(unit: string | null | undefined): boolean {
  const folded = foldAlias(unit ?? "g");
  return folded === "g" || folded === "ml" || folded === "gram" || folded === "grams";
}

function isSugarIngredient(ingredient: Pick<Ingredient, "name">): boolean {
  const name = foldAlias(ingredient.name);
  if (name.includes("sugar free") || name.includes("sugar-free")) return false;
  return (
    name === "sugar" ||
    name === "sucrose" ||
    name.includes("refined sugar") ||
    name.includes("granulated sugar") ||
    name.includes("caster sugar") ||
    name.includes("white sugar")
  );
}

function isSkimIngredient(ingredient: Pick<Ingredient, "name">): boolean {
  const name = foldAlias(ingredient.name);
  return (
    (name.includes("skim") && name.includes("milk") && !name.includes("powder")) ||
    name.includes("fat-free milk") ||
    name.includes("fat free milk") ||
    name.includes("skimmed milk")
  );
}

function isQuarkIngredient(ingredient: Pick<Ingredient, "name">): boolean {
  const name = foldAlias(ingredient.name);
  return name.includes("quark") || name.includes("greek yogurt") || name.includes("greek yoghurt");
}

function isWheyIngredient(ingredient: Pick<Ingredient, "name">): boolean {
  return foldAlias(ingredient.name).includes("whey");
}

function isSmpIngredient(ingredient: Pick<Ingredient, "name">): boolean {
  const name = foldAlias(ingredient.name);
  return name.includes("skim milk powder") || name === "smp" || name.includes("milk powder");
}

function isXanthanIngredient(ingredient: Pick<Ingredient, "name">): boolean {
  return foldAlias(ingredient.name).includes("xanthan");
}

function isSaltIngredient(ingredient: Pick<Ingredient, "name">): boolean {
  const name = foldAlias(ingredient.name);
  return name === "salt" || name.includes("pinch of salt") || name.endsWith(" salt");
}

function roundToNearest5(value: number): number {
  return Math.round(value / 5) * 5;
}

function uniqueNotes(notes: string[]): string[] {
  return [...new Set(notes)];
}
