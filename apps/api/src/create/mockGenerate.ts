import type { CreamiGenerateRequest, GeneratedRecipe, RecipeGenerateRequest, RecipeNutrition } from "@savorly/shared";
import { CREATE_AGENT_LABEL } from "./composeGeneratePrompt";

export function mockGeneratedCreate(request: RecipeGenerateRequest): GeneratedRecipe {
  const flavor =
    request.agent === "creami" ? request.flavor?.trim() || "vanilla" : request.notes.trim() || "suggested";
  const adapted = Boolean(request.adaptNote?.trim());
  const title = adapted ? `${capitalize(flavor)} ${request.agent} (adapted)` : `${capitalize(flavor)} ${request.agent}`;
  const servings = request.agent === "creami" ? (request.size === "big" ? 4 : 3) : 1;

  return {
    title,
    category: request.agent === "chef" ? "other" : request.agent === "bread" ? "bread" : "dessert",
    servings,
    prepTimeMinutes: 10,
    cookTimeMinutes: null,
    ingredients:
      request.agent === "creami"
        ? [
            { name: "protein powder", quantity: 30, unit: "g", notes: null },
            { name: "fat-free quark", quantity: 250, unit: "g", notes: null },
            { name: "fat-free milk", quantity: 150, unit: "ml", notes: null },
            { name: "xanthan gum", quantity: 1, unit: "g", notes: null },
            { name: sweetenerLabel(request.sweetener), quantity: null, unit: null, notes: null },
            { name: "cookie dough", quantity: 40, unit: "g", notes: "mix-in" },
          ]
        : [{ name: "flour", quantity: null, unit: null, notes: null }],
    steps:
      request.agent === "creami"
        ? []
        : [
            { order: 1, text: "Mix the base until smooth.", durationMinutes: 2, temperatureC: null },
            {
              order: 2,
              text: adapted ? `Adapt: ${request.adaptNote}` : "Bake until done.",
              durationMinutes: null,
              temperatureC: null,
            },
          ],
    tags: [request.agent, flavor],
    notes: request.adaptNote?.trim() || request.notes?.trim() || null,
    uncertainties: [],
    nutrition: request.agent === "creami" ? mockCreamiNutrition(request.size, request.macros) : null,
    source: {
      type: "manual",
      sourceName: CREATE_AGENT_LABEL[request.agent],
    },
  };
}

function sweetenerLabel(sweetener: CreamiGenerateRequest["sweetener"]): string {
  if (sweetener === "xylitol") return "xylitol";
  if (sweetener === "blend") return "stevia and xylitol";
  return "stevia";
}

function mockCreamiNutrition(size: CreamiGenerateRequest["size"], macros: CreamiGenerateRequest["macros"]): RecipeNutrition {
  const servings = size === "big" ? 4 : 3;
  const perServing =
    macros === "lean"
      ? { kcal: 150, proteinG: 22, carbsG: 12, fatG: 2 }
      : { kcal: 220, proteinG: 18, carbsG: 18, fatG: 6 };
  return {
    servingG: 150,
    perServing,
    perPint: {
      kcal: perServing.kcal * servings,
      proteinG: perServing.proteinG * servings,
      carbsG: perServing.carbsG * servings,
      fatG: perServing.fatG * servings,
    },
  };
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
