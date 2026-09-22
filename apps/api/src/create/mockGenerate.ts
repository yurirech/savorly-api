import {
  bakeServingG,
  BREAD_SLICE_G,
  chefServingWeightG,
  creamiSugarG,
  resolveCreamiSweetenerName,
  type BakeGenerateRequest,
  type BreadGenerateRequest,
  type ChefGenerateRequest,
  type CreamiGenerateRequest,
  type FoodCategory,
  type GeneratedRecipe,
  type RecipeMacros,
  type RecipeGenerateRequest,
  type RecipeNutrition,
} from "@savorly/shared";
import { CREATE_AGENT_LABEL } from "./composeGeneratePrompt";

export function mockAdaptSummary(request: RecipeGenerateRequest): string {
  const change = request.adaptNote?.trim();
  const goal = request.adaptGoal?.trim();
  const parts: string[] = [];
  if (change) {
    parts.push(`Applied your change: ${change}.`);
  }
  if (goal) {
    parts.push(`Adjusted ingredients to work toward: ${goal}.`);
  }
  return parts.join(" ") || "Updated the recipe to match your request.";
}

export function mockGeneratedCreate(request: RecipeGenerateRequest): GeneratedRecipe {
  if (request.agent === "chef") {
    return mockChefRecipe(request);
  }
  if (request.agent === "bread") {
    return mockBreadRecipe(request);
  }
  if (request.agent === "bake") {
    return mockBakeRecipe(request);
  }
  return mockCreamiRecipe(request);
}

function mockAdaptNotes(request: { adaptNote?: string; adaptGoal?: string; notes?: string }): string | null {
  const parts = [request.adaptNote?.trim(), request.adaptGoal?.trim()].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" — ");
  }
  return request.notes?.trim() || null;
}

function isMockAdapt(request: { adaptNote?: string; adaptGoal?: string }): boolean {
  return Boolean(request.adaptNote?.trim() || request.adaptGoal?.trim());
}

function mockCreamiRecipe(request: CreamiGenerateRequest): GeneratedRecipe {
  const flavor = request.flavor?.trim() || "vanilla";
  const adapted = isMockAdapt(request);
  const title = adapted ? `${capitalize(flavor)} creami (adapted)` : `${capitalize(flavor)} creami`;

  return {
    title,
    category: "dessert",
    servings: request.size === "big" ? 4 : 3,
    prepTimeMinutes: 10,
    cookTimeMinutes: null,
    ingredients: [
      { name: "protein powder", quantity: 30, unit: "g", notes: null },
      { name: "fat-free quark", quantity: 250, unit: "g", notes: null },
      { name: "fat-free milk", quantity: 150, unit: "ml", notes: null },
      { name: "xanthan gum", quantity: 1, unit: "g", notes: null },
      { name: "refined sugar", quantity: creamiSugarG(request.size), unit: "g", notes: null },
      { name: resolveCreamiSweetenerName(request.sweetenerKind, request.sweetenerName), quantity: null, unit: null, notes: null },
      { name: "cookie dough", quantity: 40, unit: "g", notes: "mix-in" },
    ],
    steps: [],
    tags: ["creami", flavor],
    notes: mockAdaptNotes(request),
    uncertainties: [],
    nutrition: mockCreamiNutrition(request.size, request.macros),
    source: {
      type: "manual",
      sourceName: CREATE_AGENT_LABEL.creami,
    },
  };
}

function mockBreadRecipe(request: BreadGenerateRequest): GeneratedRecipe {
  const dish = request.notes?.trim() || "suggested";
  const adapted = isMockAdapt(request);
  const title = adapted ? `${capitalize(dish)} (adapted)` : capitalize(dish);
  const program = kneadFromNotes(request.notes) ? "Knead" : "Basic";
  const sizeLabel = request.size === "large" ? "Large (1000 g)" : "Medium (750 g)";

  return {
    title,
    category: "bread",
    servings: request.size === "large" ? 16 : 12,
    prepTimeMinutes: 10,
    cookTimeMinutes: program === "Knead" ? 20 : 180,
    ingredients: [
      { name: "flour", quantity: request.size === "large" ? 570 : 420, unit: "g", notes: null },
      { name: "water", quantity: request.size === "large" ? 342 : 252, unit: "g", notes: null },
      { name: "instant yeast", quantity: request.size === "large" ? 10 : 8, unit: "g", notes: null },
    ],
    steps: [
      {
        order: 1,
        text: `Use the ${program} program, ${sizeLabel}. Load: liquids → dry → yeast last.`,
        durationMinutes: null,
        temperatureC: null,
      },
      {
        order: 2,
        text:
          adapted
            ? `Adapt: ${request.adaptNote}`
            : program === "Knead"
              ? "Shape, proof, and bake in the oven — do not run a full machine bake cycle."
              : "Start the machine and wait for the bake to finish.",
        durationMinutes: null,
        temperatureC: null,
      },
    ],
    tags: ["bread", program.toLowerCase(), request.size, request.style],
    notes: mockAdaptNotes(request),
    uncertainties: [],
    nutrition: mockSimpleNutrition(BREAD_SLICE_G, {
      kcal: request.style === "lighter" ? 95 : 110,
      proteinG: 4,
      carbsG: 20,
      fatG: request.style === "lighter" ? 1 : 1.5,
    }),
    source: {
      type: "manual",
      sourceName: CREATE_AGENT_LABEL.bread,
    },
  };
}

function mockBakeRecipe(request: BakeGenerateRequest): GeneratedRecipe {
  const dish = request.notes?.trim() || "suggested";
  const adapted = isMockAdapt(request);
  const title = adapted ? `${capitalize(dish)} (adapted)` : capitalize(dish);

  return {
    title,
    category: "dessert",
    servings: request.kind === "other" ? 8 : 12,
    prepTimeMinutes: 20,
    cookTimeMinutes: request.kind === "cake" ? 35 : 22,
    ingredients: [
      { name: "flour", quantity: 200, unit: "g", notes: null },
      { name: "sugar", quantity: request.style === "lighter" ? 140 : 180, unit: "g", notes: null },
      { name: "oil", quantity: request.style === "lighter" ? 60 : 80, unit: "g", notes: null },
    ],
    steps: [
      { order: 1, text: "Heat the oven to 170 °C / 340 °F.", durationMinutes: null, temperatureC: 170 },
      {
        order: 2,
        text: adapted ? `Adapt: ${request.adaptNote}` : bakeStepFor(request.kind),
        durationMinutes: request.kind === "cake" ? 35 : 22,
        temperatureC: 170,
      },
    ],
    tags: ["bake", request.kind, request.style],
    notes: mockAdaptNotes(request),
    uncertainties: [],
    nutrition: mockSimpleNutrition(bakeServingG(request.kind), {
      kcal: request.style === "lighter" ? 220 : 280,
      proteinG: 5,
      carbsG: request.style === "lighter" ? 32 : 38,
      fatG: request.style === "lighter" ? 8 : 12,
    }),
    source: {
      type: "manual",
      sourceName: CREATE_AGENT_LABEL.bake,
    },
  };
}

function bakeStepFor(kind: BakeGenerateRequest["kind"]): string {
  if (kind === "muffin") return "Divide into 12 muffin tins and bake until a toothpick comes out clean.";
  if (kind === "cupcake") return "Divide into 12 cupcake tins and bake; frost if you like.";
  if (kind === "other") return "Bake in the pan until set.";
  return "Bake two 8-inch layers until a toothpick comes out clean.";
}

function kneadFromNotes(notes?: string): boolean {
  const text = notes?.toLowerCase() ?? "";
  return /\b(pizza|roll|focaccia|dough)\b/.test(text);
}

function mockChefRecipe(request: ChefGenerateRequest): GeneratedRecipe {
  const dish = request.notes?.trim() || "suggested";
  const adapted = isMockAdapt(request);
  const title = adapted ? `${capitalize(dish)} (adapted)` : capitalize(dish);

  return {
    title,
    category: chefCategory(request.mealType),
    servings: request.servings,
    prepTimeMinutes: 15,
    cookTimeMinutes: request.mealType === "snack" ? 10 : 25,
    ingredients: [
      { name: "olive oil", quantity: request.style === "lighter" ? 8 : 12, unit: "g", notes: null },
      { name: request.style === "nutritious" ? "chicken breast" : "pasta", quantity: 180, unit: "g", notes: null },
    ],
    steps: [
      { order: 1, text: "Prep the ingredients.", durationMinutes: 5, temperatureC: null },
      {
        order: 2,
        text: adapted ? `Adapt: ${request.adaptNote}` : "Cook until done.",
        durationMinutes: 15,
        temperatureC: null,
      },
    ],
    tags: ["chef", request.mealType, request.style],
    notes: mockAdaptNotes(request),
    uncertainties: [],
    nutrition: mockChefNutrition(request.mealType, request.style),
    source: {
      type: "manual",
      sourceName: CREATE_AGENT_LABEL.chef,
    },
  };
}

function chefCategory(mealType: ChefGenerateRequest["mealType"]): FoodCategory {
  if (mealType === "side") return "salad";
  if (mealType === "snack") return "snack";
  return "pasta";
}

function mockChefNutrition(
  mealType: ChefGenerateRequest["mealType"],
  style: ChefGenerateRequest["style"],
): RecipeNutrition {
  const per100g: RecipeMacros =
    style === "lighter"
      ? { kcal: 140, proteinG: 9, carbsG: 16, fatG: 4 }
      : style === "nutritious"
        ? { kcal: 160, proteinG: 14, carbsG: 15, fatG: 5 }
        : { kcal: 180, proteinG: 8, carbsG: 22, fatG: 6 };
  return mockSimpleNutrition(chefServingWeightG(mealType), per100g);
}

function mockSimpleNutrition(servingG: number, per100g: RecipeMacros): RecipeNutrition {
  const factor = servingG / 100;
  return {
    servingG,
    perServing: {
      kcal: roundMacro(per100g.kcal * factor),
      proteinG: roundMacro(per100g.proteinG * factor),
      carbsG: roundMacro(per100g.carbsG * factor),
      fatG: roundMacro(per100g.fatG * factor),
    },
  };
}

function roundMacro(value: number): number {
  return Math.round(value * 10) / 10;
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
