import type { GeneratedRecipe } from "@savorly/shared";

let draft: GeneratedRecipe | null = null;
let editingId: string | null = null;

export function setReviewDraft(recipe: GeneratedRecipe, id?: string) {
  draft = recipe;
  editingId = id ?? null;
}

export function getReviewDraft(): { recipe: GeneratedRecipe; editingId: string | null } | null {
  return draft ? { recipe: draft, editingId } : null;
}

export function clearReviewDraft() {
  draft = null;
  editingId = null;
}
