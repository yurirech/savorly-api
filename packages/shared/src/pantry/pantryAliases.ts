import { foldAlias } from "../ingredients/units";

export const MAX_PANTRY_ALIASES = 32;
export const MAX_PANTRY_ALIAS_LENGTH = 80;
export const MAX_PANTRY_DISPLAY_NAME_LENGTH = 80;

export function normalizePantryAlias(value: string): string {
  return foldAlias(value);
}

export function sanitizePantryAliases(displayName: string, aliases: string[] = []): string[] {
  const trimmedName = displayName.trim();
  if (!trimmedName) {
    throw new Error("Display name is required.");
  }
  if (trimmedName.length > MAX_PANTRY_DISPLAY_NAME_LENGTH) {
    throw new Error("Display name is too long.");
  }

  const seen = new Set<string>();
  const result: string[] = [];

  function push(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > MAX_PANTRY_ALIAS_LENGTH) {
      return;
    }
    const key = normalizePantryAlias(trimmed);
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(trimmed);
  }

  push(trimmedName);
  for (const alias of aliases) {
    push(alias);
  }

  if (result.length > MAX_PANTRY_ALIASES) {
    throw new Error("Too many aliases.");
  }

  return result;
}
