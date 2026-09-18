import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  creamiPintFillG,
  creamiSugarG,
  resolveCreamiSweetenerName,
  type GeneratedRecipe,
  type RecipeGenerateRequest,
} from "@savorly/shared";

const promptsDir = join(dirname(fileURLToPath(import.meta.url)), "prompts");

export const CREATE_AGENT_LABEL = {
  creami: "Creami",
  bread: "Bread",
  bake: "Bake",
  chef: "Chef",
} as const;

export function promptSlicesFor(request: RecipeGenerateRequest): string[] {
  if (request.agent === "creami") {
    const slices = [
      "creami/core.md",
      "creami/science.md",
      "creami/staples.md",
      `creami/size-${request.size}.md`,
      `creami/macros-${request.macros}.md`,
      `creami/texture-${request.texture}.md`,
    ];
    if (request.adaptNote?.trim()) {
      slices.push("creami/adapt.md");
    }
    return slices;
  }
  return [`${request.agent}/core.md`];
}

export function composeSystemInstruction(request: RecipeGenerateRequest): string {
  return promptSlicesFor(request)
    .map((relative) => readFileSync(join(promptsDir, relative), "utf8").trim())
    .join("\n\n");
}

export function composeUserMessage(request: RecipeGenerateRequest): string {
  const lines =
    request.agent === "creami"
      ? [
          "agent: creami",
          `size: ${request.size}`,
          `pintFillG: ${creamiPintFillG(request.size)}`,
          `sugarG: ${creamiSugarG(request.size)}`,
          `servings: ${request.size === "big" ? 4 : 3}`,
          `macros: ${request.macros}`,
          `texture: ${request.texture}`,
          `sweetenerKind: ${request.sweetenerKind}`,
          `sweetener: ${resolveCreamiSweetenerName(request.sweetenerKind, request.sweetenerName)}`,
          `flavor: ${request.flavor?.trim() || "invent one dessert combo"}`,
          `notes: ${request.notes?.trim() || ""}`,
        ]
      : [`agent: ${request.agent}`, `notes: ${request.notes.trim() || "suggest"}`];

  if (request.previousRecipe && request.adaptNote?.trim()) {
    lines.push(
      "",
      "previous recipe:",
      JSON.stringify(slimPreviousRecipe(request.previousRecipe)),
      "",
      `adapt: ${request.adaptNote.trim()}`,
    );
  }

  return lines.join("\n");
}

function slimPreviousRecipe(recipe: GeneratedRecipe) {
  return {
    title: recipe.title,
    ingredients: recipe.ingredients.map((ingredient) => ({
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
    })),
    steps: recipe.steps.map((step) => ({ order: step.order, text: step.text })),
  };
}
