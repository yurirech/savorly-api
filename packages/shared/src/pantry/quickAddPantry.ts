import { lookupPantryKey } from "../ingredients/dictionary";
import type { Ingredient } from "../recipe";
import { STARTER_PANTRY_STAPLES } from "./starterStaples";

export type QuickAddPantryAction =
  | { kind: "starter"; starterKey: string }
  | { kind: "custom"; displayName: string; suggestedAliases?: string[] };

function starterForCanonicalOrKey(key: string): string | undefined {
  const starter = STARTER_PANTRY_STAPLES.find((item) => item.canonicalKey === key || item.key === key);
  return starter?.key;
}

export function resolveQuickAddPantryAction(ingredient: Ingredient): QuickAddPantryAction {
  const displayName = ingredient.name.trim() || "Ingredient";

  const fromCanonical = ingredient.canonicalKey?.trim();
  if (fromCanonical) {
    const starterKey = starterForCanonicalOrKey(fromCanonical);
    if (starterKey) {
      return { kind: "starter", starterKey };
    }
  }

  const dictionaryMatch = lookupPantryKey(ingredient.name);
  if (dictionaryMatch) {
    const starterKey = starterForCanonicalOrKey(dictionaryMatch.key);
    if (starterKey) {
      return { kind: "starter", starterKey };
    }
  }

  return {
    kind: "custom",
    displayName,
    suggestedAliases: displayName.length > 0 ? [displayName] : undefined,
  };
}
