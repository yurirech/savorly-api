import { foldAlias, normalizeUnit } from "./units";
import type { Ingredient } from "../recipe";

export type PantryIngredient = {
  key: string;
  gramsPerCup: number;
  aliases: string[];
};

export const PANTRY_INGREDIENTS: PantryIngredient[] = [
  {
    key: "all_purpose_flour",
    gramsPerCup: 125,
    aliases: [
      "flour",
      "plain flour",
      "all purpose flour",
      "all-purpose flour",
      "ap flour",
      "farina",
      "farina 0",
      "farinha",
      "farinha de trigo",
      "farinha branca",
    ],
  },
  {
    key: "tipo_00_flour",
    gramsPerCup: 120,
    aliases: ["00 flour", "tipo 00", "farina 00", "farina tipo 00", "farinha 00", "farinha tipo 00"],
  },
  {
    key: "bread_flour",
    gramsPerCup: 127,
    aliases: ["bread flour", "strong flour", "farina manitoba", "farinha de pao", "farinha pao"],
  },
  {
    key: "granulated_sugar",
    gramsPerCup: 200,
    aliases: [
      "sugar",
      "white sugar",
      "granulated sugar",
      "caster sugar",
      "zucchero",
      "zucchero semolato",
      "acucar",
      "acucar cristal",
      "acucar refinado",
    ],
  },
  {
    key: "brown_sugar",
    gramsPerCup: 220,
    aliases: ["brown sugar", "zucchero di canna", "zucchero muscovado", "acucar mascavo", "acucar demerara"],
  },
  {
    key: "powdered_sugar",
    gramsPerCup: 120,
    aliases: ["powdered sugar", "icing sugar", "confectioners sugar", "zucchero a velo", "acucar de confeiteiro"],
  },
  {
    key: "unsalted_butter",
    gramsPerCup: 227,
    aliases: ["butter", "unsalted butter", "burro", "manteiga", "manteiga sem sal"],
  },
  {
    key: "olive_oil",
    gramsPerCup: 216,
    aliases: [
      "olive oil",
      "extra virgin olive oil",
      "olio di oliva",
      "olio extravergine",
      "olio evo",
      "azeite",
      "azeite de oliva",
      "azeite extra virgem",
    ],
  },
  {
    key: "vegetable_oil",
    gramsPerCup: 218,
    aliases: ["oil", "vegetable oil", "sunflower oil", "olio di semi", "olio di girasole", "oleo", "oleo vegetal"],
  },
  {
    key: "coconut_oil",
    gramsPerCup: 218,
    aliases: ["coconut oil", "olio di cocco", "oleo de coco"],
  },
  {
    key: "milk",
    gramsPerCup: 245,
    aliases: ["milk", "whole milk", "latte", "latte intero", "leite", "leite integral"],
  },
  {
    key: "water",
    gramsPerCup: 240,
    aliases: ["water", "acqua", "agua"],
  },
  {
    key: "heavy_cream",
    gramsPerCup: 238,
    aliases: ["cream", "heavy cream", "whipping cream", "panna", "panna fresca", "creme de leite", "creme de leite fresco"],
  },
  {
    key: "yogurt",
    gramsPerCup: 245,
    aliases: ["yogurt", "yoghurt", "greek yogurt", "yogurt greco", "iogurte", "iogurte grego"],
  },
  {
    key: "sour_cream",
    gramsPerCup: 240,
    aliases: ["sour cream", "panna acida", "creme azedo"],
  },
  {
    key: "honey",
    gramsPerCup: 340,
    aliases: ["honey", "miele", "mel"],
  },
  {
    key: "maple_syrup",
    gramsPerCup: 312,
    aliases: ["maple syrup", "sciroppo d acero", "xarope de maple"],
  },
  {
    key: "cocoa_powder",
    gramsPerCup: 85,
    aliases: ["cocoa", "cocoa powder", "unsweetened cocoa", "cacao", "cacao amaro", "cacau", "cacau em po"],
  },
  {
    key: "cornstarch",
    gramsPerCup: 128,
    aliases: ["cornstarch", "corn starch", "cornflour", "amido di mais", "maizena", "amido de milho"],
  },
  {
    key: "rice",
    gramsPerCup: 185,
    aliases: ["rice", "white rice", "riso", "riso bianco", "arroz", "arroz branco"],
  },
  {
    key: "oats",
    gramsPerCup: 90,
    aliases: ["oats", "rolled oats", "avena", "fiocchi d avena", "aveia", "aveia em flocos"],
  },
  {
    key: "salt",
    gramsPerCup: 273,
    aliases: ["salt", "table salt", "kosher salt", "sale", "sale fino", "sal", "sal refinado"],
  },
  {
    key: "almond_flour",
    gramsPerCup: 96,
    aliases: ["almond flour", "almond meal", "farina di mandorle", "farinha de amendoa"],
  },
  {
    key: "peanut_butter",
    gramsPerCup: 270,
    aliases: ["peanut butter", "burro di arachidi", "pasta de amendoim"],
  },
  {
    key: "cream_cheese",
    gramsPerCup: 232,
    aliases: ["cream cheese", "formaggio spalmabile", "requeijao"],
  },
  {
    key: "chocolate_chips",
    gramsPerCup: 170,
    aliases: ["chocolate chips", "gocce di cioccolato", "gotas de chocolate"],
  },
  {
    key: "parmesan",
    gramsPerCup: 100,
    aliases: ["parmesan", "parmigiano", "parmigiano reggiano", "parmesao"],
  },
  {
    key: "baking_powder",
    gramsPerCup: 192,
    aliases: ["baking powder", "lievito in polvere", "fermento em po", "fermento quimico"],
  },
  {
    key: "baking_soda",
    gramsPerCup: 220,
    aliases: ["baking soda", "bicarbonate of soda", "bicarbonato", "bicarbonato di sodio", "bicarbonato de sodio"],
  },
];

const byKey = new Map(PANTRY_INGREDIENTS.map((item) => [item.key, item]));

const aliasIndex = new Map<string, PantryIngredient>();
for (const item of PANTRY_INGREDIENTS) {
  aliasIndex.set(foldAlias(item.key.replaceAll("_", " ")), item);
  aliasIndex.set(item.key, item);
  for (const alias of item.aliases) {
    aliasIndex.set(foldAlias(alias), item);
  }
}

const aliasesByLength = [...aliasIndex.keys()].sort((a, b) => b.length - a.length);

export function pantryByKey(key: string): PantryIngredient | undefined {
  return byKey.get(key);
}

export function pantryKeys(): string[] {
  return PANTRY_INGREDIENTS.map((item) => item.key);
}

export function lookupPantryKey(name: string): PantryIngredient | undefined {
  const folded = foldAlias(name);
  const exact = aliasIndex.get(folded);
  if (exact) return exact;
  for (const alias of aliasesByLength) {
    if (folded === alias || folded.startsWith(`${alias} `) || folded.endsWith(` ${alias}`)) {
      return aliasIndex.get(alias);
    }
  }
  return undefined;
}

export function pantryCanonicalKeyHint(): string {
  return `If an ingredient is a pantry staple, set canonicalKey to one of: ${pantryKeys().join(", ")}. Keep the ingredient display name in the source language; do not translate Italian or Portuguese names. Do not invent gramsPerCup.`;
}

export function gramsPerCupForIngredient(name: string, canonicalKey?: string | null, snapshot?: number | null): number | null {
  if (snapshot && Number.isFinite(snapshot) && snapshot > 0) return snapshot;
  if (canonicalKey) {
    const fromKey = pantryByKey(canonicalKey);
    if (fromKey) return fromKey.gramsPerCup;
  }
  return lookupPantryKey(name)?.gramsPerCup ?? null;
}

export function applyPantrySnapshot(ingredient: Ingredient, extras: PantryIngredient[] = []): Ingredient {
  const unit = normalizeUnit(ingredient.unit) ?? ingredient.unit ?? null;
  const fromKey = ingredient.canonicalKey
    ? pantryByKey(ingredient.canonicalKey) ?? extras.find((item) => item.key === ingredient.canonicalKey)
    : undefined;
  const fromName = lookupPantryKey(ingredient.name) ?? matchExtra(ingredient.name, extras);
  const pantry = fromKey ?? fromName;
  if (!pantry) {
    return { ...ingredient, unit, canonicalKey: ingredient.canonicalKey ?? null, gramsPerCup: ingredient.gramsPerCup ?? null };
  }
  return {
    ...ingredient,
    unit,
    canonicalKey: pantry.key,
    gramsPerCup: pantry.gramsPerCup,
  };
}

function matchExtra(name: string, extras: PantryIngredient[]): PantryIngredient | undefined {
  const folded = foldAlias(name);
  return extras.find(
    (item) => item.key === folded || foldAlias(item.key.replaceAll("_", " ")) === folded || item.aliases.some((alias) => foldAlias(alias) === folded),
  );
}
