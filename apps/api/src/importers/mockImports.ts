import type { GeneratedRecipe } from "@savorly/shared";
import type { ImportedRecipeSource } from "./types";

export function mockImportedSource(kind: ImportedRecipeSource["sourceType"]): ImportedRecipeSource {
  if (kind === "instagram") {
    return {
      sourceType: "instagram",
      originalUrl: "https://www.instagram.com/reel/mock/",
      sourceName: "Instagram",
      author: "mock.baker",
      caption: "Brown butter chocolate chip cookies. 200g flour, 150g butter, bake until golden.",
      extractedText: "Brown butter chocolate chip cookies. 200g flour, 150g butter, bake until golden.",
    };
  }

  if (kind === "youtube") {
    return {
      sourceType: "youtube",
      originalUrl: "https://www.youtube.com/shorts/mock/",
      sourceName: "YouTube",
      author: "mock.cook",
      caption: "Garlic pasta in a skillet. 200g spaghetti, 4 cloves garlic, olive oil.",
      transcript: "Boil the pasta and toss it with garlic oil.",
      extractedText:
        "Garlic pasta in a skillet. 200g spaghetti, 4 cloves garlic, olive oil.\n\nBoil the pasta and toss it with garlic oil.",
    };
  }

  if (kind === "website") {
    return {
      sourceType: "website",
      originalUrl: "https://example.com/recipes/tomato-soup",
      sourceName: "example.com",
      extractedText: "Simple tomato soup. Onion, garlic, tomatoes, simmer 20 minutes. Serve with bread.",
    };
  }

  return {
    sourceType: "text",
    sourceName: "Pasted text",
    originalText: "Weekend pancakes. Flour, milk, eggs. Cook on a hot pan until bubbles form.",
    extractedText: "Weekend pancakes. Flour, milk, eggs. Cook on a hot pan until bubbles form.",
  };
}

export function mockGeneratedRecipe(source: ImportedRecipeSource): GeneratedRecipe {
  if (source.sourceType === "instagram") {
    return {
      title: "Brown butter chocolate chip cookies",
      category: "cookie",
      servings: null,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      ingredients: [
        { name: "flour", quantity: 200, unit: "g", notes: null },
        { name: "butter", quantity: 150, unit: "g", notes: "brown butter" },
        { name: "chocolate chips", quantity: null, unit: null, notes: null },
      ],
      steps: [
        { order: 1, text: "Brown the butter and mix with the remaining ingredients.", durationMinutes: null, temperatureC: null },
        { order: 2, text: "Bake until golden.", durationMinutes: null, temperatureC: null },
      ],
      tags: ["cookie", "chocolate"],
      notes: null,
      uncertainties: ["Baking temperature and time were not specified.", "Chocolate chip quantity was not specified."],
      source: {
        type: "instagram",
        originalUrl: source.originalUrl,
        sourceName: source.sourceName,
        author: source.author,
        caption: source.caption,
        transcript: source.transcript,
      },
    };
  }

  if (source.sourceType === "youtube") {
    return {
      title: "Garlic skillet pasta",
      category: "pasta",
      servings: null,
      prepTimeMinutes: null,
      cookTimeMinutes: null,
      ingredients: [
        { name: "spaghetti", quantity: 200, unit: "g", notes: null },
        { name: "garlic", quantity: 4, unit: null, notes: "cloves" },
        { name: "olive oil", quantity: null, unit: null, notes: null },
      ],
      steps: [
        { order: 1, text: "Boil the pasta.", durationMinutes: null, temperatureC: null },
        { order: 2, text: "Toss with garlic oil.", durationMinutes: null, temperatureC: null },
      ],
      tags: ["pasta", "garlic"],
      notes: null,
      uncertainties: ["Olive oil quantity was not specified."],
      source: {
        type: "youtube",
        originalUrl: source.originalUrl,
        sourceName: source.sourceName,
        author: source.author,
        caption: source.caption,
        transcript: source.transcript,
      },
    };
  }

  if (source.sourceType === "website") {
    return {
      title: "Simple tomato soup",
      category: "soup",
      servings: null,
      prepTimeMinutes: null,
      cookTimeMinutes: 20,
      ingredients: [
        { name: "onion", quantity: null, unit: null, notes: null },
        { name: "garlic", quantity: null, unit: null, notes: null },
        { name: "tomatoes", quantity: null, unit: null, notes: null },
      ],
      steps: [
        { order: 1, text: "Cook onion, garlic and tomatoes.", durationMinutes: null, temperatureC: null },
        { order: 2, text: "Simmer and serve with bread.", durationMinutes: 20, temperatureC: null },
      ],
      tags: ["soup", "tomato"],
      notes: null,
      uncertainties: ["Ingredient quantities were not specified."],
      source: {
        type: "website",
        originalUrl: source.originalUrl,
        sourceName: source.sourceName,
      },
    };
  }

  return {
    title: "Weekend pancakes",
    category: "breakfast",
    servings: null,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    ingredients: [
      { name: "flour", quantity: null, unit: null, notes: null },
      { name: "milk", quantity: null, unit: null, notes: null },
      { name: "eggs", quantity: null, unit: null, notes: null },
    ],
    steps: [
      { order: 1, text: "Mix flour, milk and eggs.", durationMinutes: null, temperatureC: null },
      { order: 2, text: "Cook on a hot pan until bubbles form.", durationMinutes: null, temperatureC: null },
    ],
    tags: ["pancake", "breakfast"],
    notes: null,
    uncertainties: ["Quantities, pan temperature and timings were not specified."],
    source: {
      type: "text",
      sourceName: source.sourceName,
      originalText: source.originalText,
    },
  };
}
