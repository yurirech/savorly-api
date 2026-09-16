import type { GeneratedRecipe, RecipeGenerateRequest } from "@savorly/shared";
import { CREATE_AGENT_LABEL } from "./composeGeneratePrompt";

export function mockGeneratedCreate(request: RecipeGenerateRequest): GeneratedRecipe {
  const flavor =
    request.agent === "creami" ? request.flavor?.trim() || "vanilla" : request.notes.trim() || "suggested";
  const adapted = Boolean(request.adaptNote?.trim());
  const title = adapted ? `${capitalize(flavor)} ${request.agent} (adapted)` : `${capitalize(flavor)} ${request.agent}`;

  return {
    title,
    category: request.agent === "chef" ? "other" : request.agent === "bread" ? "bread" : "dessert",
    servings: 1,
    prepTimeMinutes: 10,
    cookTimeMinutes: null,
    ingredients:
      request.agent === "creami"
        ? [
            { name: "protein powder", quantity: 30, unit: "g", notes: null },
            { name: "fat-free quark", quantity: 250, unit: "g", notes: null },
            { name: "fat-free milk", quantity: 150, unit: "ml", notes: null },
            { name: "xanthan gum", quantity: 1, unit: "g", notes: null },
            { name: request.sweetener === "sucralose" ? "sucralose" : "stevia", quantity: null, unit: null, notes: null },
          ]
        : [{ name: "flour", quantity: null, unit: null, notes: null }],
    steps: [
      { order: 1, text: "Mix the base until smooth.", durationMinutes: 2, temperatureC: null },
      { order: 2, text: adapted ? `Adapt: ${request.adaptNote}` : "Freeze, then spin in the machine.", durationMinutes: null, temperatureC: null },
    ],
    tags: [request.agent, flavor],
    notes: request.adaptNote?.trim() || request.notes?.trim() || null,
    uncertainties: [],
    source: {
      type: "manual",
      sourceName: CREATE_AGENT_LABEL[request.agent],
    },
  };
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
