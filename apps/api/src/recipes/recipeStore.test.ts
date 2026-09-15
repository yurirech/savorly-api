import { describe, expect, it } from "vitest";
import { mockGeneratedRecipe, mockImportedSource } from "../importers/mockImports";
import { searchDocument } from "./recipeStore";

describe("searchDocument", () => {
  it("indexes title, ingredients, category, tags and source", () => {
    const recipe = mockGeneratedRecipe(mockImportedSource("instagram"));
    const doc = searchDocument(recipe);
    expect(doc.title.toLowerCase()).toContain("cookie");
    expect(doc.category).toBe("cookie");
    expect(doc.ingredientNames).toContain("flour");
    expect(doc.tags.length).toBeGreaterThan(0);
    expect(doc.sourceAuthor).toBe("mock.baker");
    expect(doc.sourceName).toBe("Instagram");
  });
});
