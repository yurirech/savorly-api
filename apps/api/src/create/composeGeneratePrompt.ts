import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  breadLoafWeightG,
  chefServingWeightHint,
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
  if (request.agent === "chef") {
    const slices = ["chef/core.md", "chef/science.md", `chef/meal-${request.mealType}.md`];
    if (request.style !== "regular") {
      slices.push(`chef/style-${request.style}.md`);
    }
    if (request.adaptNote?.trim()) {
      slices.push("chef/adapt.md");
    }
    return slices;
  }
  if (request.agent === "bread") {
    const slices = ["bread/core.md", "bread/science.md", "bread/programs.md", `bread/size-${request.size}.md`];
    if (request.style !== "regular") {
      slices.push("bread/style-lighter.md");
    }
    if (request.adaptNote?.trim()) {
      slices.push("bread/adapt.md");
    }
    return slices;
  }
  const slices = ["bake/core.md", "bake/science.md", `bake/kind-${request.kind}.md`];
  if (request.style !== "regular") {
    slices.push("bake/style-lighter.md");
  }
  if (request.adaptNote?.trim()) {
    slices.push("bake/adapt.md");
  }
  return slices;
}

export function composeSystemInstruction(request: RecipeGenerateRequest): string {
  return promptSlicesFor(request)
    .map((relative) => readFileSync(join(promptsDir, relative), "utf8").trim())
    .join("\n\n");
}

export function composeUserMessage(request: RecipeGenerateRequest): string {
  const lines = userLinesFor(request);

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

function userLinesFor(request: RecipeGenerateRequest): string[] {
  if (request.agent === "creami") {
    return [
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
    ];
  }
  if (request.agent === "chef") {
    return [
      "agent: chef",
      `mealType: ${request.mealType}`,
      `servings: ${request.servings}`,
      `servingWeightG: ${chefServingWeightHint(request.mealType)}`,
      `style: ${request.style}`,
      `notes: ${request.notes?.trim() || "suggest a specific dish"}`,
    ];
  }
  if (request.agent === "bread") {
    return [
      "agent: bread",
      `size: ${request.size}`,
      `loafWeightG: ${breadLoafWeightG(request.size)}`,
      `style: ${request.style}`,
      `notes: ${request.notes?.trim() || "suggest a specific loaf or dough"}`,
    ];
  }
  return [
    "agent: bake",
    `kind: ${request.kind}`,
    `style: ${request.style}`,
    `notes: ${request.notes?.trim() || "suggest a specific bake"}`,
  ];
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
