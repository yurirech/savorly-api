import { eq } from "drizzle-orm";
import { applyPantrySnapshot } from "@savorly/shared";
import type { GeneratedRecipe } from "@savorly/shared";
import type { Database } from "./client";
import { recipes, users } from "./schema";
import { addRecipesToCookbook, createCookbook } from "../cookbooks/cookbookStore";
import { mockGeneratedRecipe, mockImportedSource } from "../importers/mockImports";
import { saveRecipe } from "../recipes/recipeStore";
import { DEFAULT_ADMIN_EMAIL } from "./seedAdmin";

const LEMON_GARLIC_PASTA: GeneratedRecipe = {
  title: "Lemon garlic pasta",
  category: "pasta",
  servings: 2,
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  ingredients: [
    { name: "spaghetti", quantity: 200, unit: "g", notes: null },
    { name: "garlic cloves", quantity: 3, unit: null, notes: "thinly sliced" },
    { name: "lemon", quantity: 1, unit: null, notes: "zest and juice" },
    { name: "olive oil", quantity: 3, unit: "tbsp", notes: null },
    { name: "parmesan", quantity: 40, unit: "g", notes: "finely grated" },
    { name: "salt", quantity: null, unit: null, notes: "to taste" },
    { name: "black pepper", quantity: null, unit: null, notes: "to taste" },
    { name: "parsley", quantity: null, unit: null, notes: "optional, chopped" },
  ].map((ingredient) => applyPantrySnapshot(ingredient)),
  steps: [
    {
      order: 1,
      text: "Boil the spaghetti in well-salted water until just shy of al dente. Keep a mug of the cooking water.",
      durationMinutes: 9,
      temperatureC: null,
    },
    {
      order: 2,
      text: "Warm the olive oil in a wide pan and gently cook the garlic until fragrant, not browned.",
      durationMinutes: 2,
      temperatureC: null,
    },
    {
      order: 3,
      text: "Toss in the drained pasta with lemon zest, juice, a splash of cooking water, and parmesan until glossy.",
      durationMinutes: 2,
      temperatureC: null,
    },
    {
      order: 4,
      text: "Season with salt and pepper. Finish with parsley if you have it.",
      durationMinutes: null,
      temperatureC: null,
    },
  ],
  tags: ["pasta", "weeknight", "lemon"],
  notes: "Add a knob of butter at the end if you want it silkier.",
  uncertainties: [],
  source: {
    type: "manual",
    sourceName: "Savorly kitchen",
    author: "Savorly",
  },
};

export async function ensureAdminDemoKitchen(db: Database): Promise<void> {
  const [admin] = await db.select().from(users).where(eq(users.email, DEFAULT_ADMIN_EMAIL));
  if (!admin) {
    return;
  }

  const existing = await db.select({ id: recipes.id }).from(recipes).where(eq(recipes.userId, admin.id)).limit(1);
  if (existing[0]) {
    return;
  }

  const pasta = await saveRecipe(db, admin.id, LEMON_GARLIC_PASTA);
  const soup = await saveRecipe(db, admin.id, mockGeneratedRecipe(mockImportedSource("website")));
  const pancakes = await saveRecipe(db, admin.id, mockGeneratedRecipe(mockImportedSource("text")));
  await saveRecipe(db, admin.id, mockGeneratedRecipe(mockImportedSource("instagram")));

  const cookbook = await createCookbook(db, admin.id, "Weeknight dinners");
  await addRecipesToCookbook(db, admin.id, cookbook.id, [pasta.id, soup.id, pancakes.id]);
  console.log("Seeded admin demo kitchen (Weeknight dinners).");
}
