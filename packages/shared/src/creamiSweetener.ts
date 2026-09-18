import type { CreamiSweetenerKind } from "./recipe";

export function resolveCreamiSweetenerName(
  kind: CreamiSweetenerKind,
  name?: string | null,
): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  return kind === "bulky" ? "xylitol" : "stevia";
}
