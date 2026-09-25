import type { GeneratedRecipe } from "@savorly/shared";

let draft: GeneratedRecipe | null = null;
let editingId: string | null = null;
let returnTo = "/(app)/(tabs)";

export function setImportReturnTo(href: string) {
  returnTo = href;
}

export function setReviewDraft(recipe: GeneratedRecipe, id?: string, nextReturnTo?: string) {
  draft = recipe;
  editingId = id ?? null;
  if (nextReturnTo) {
    returnTo = nextReturnTo;
  }
}

export function getReviewDraft(): { recipe: GeneratedRecipe; editingId: string | null; returnTo: string } | null {
  return draft ? { recipe: draft, editingId, returnTo } : null;
}

export function clearReviewDraft() {
  draft = null;
  editingId = null;
  returnTo = "/(app)/(tabs)";
}
