import { describe, expect, it } from "vitest";
import { resolveQuickAddPantryAction } from "./quickAddPantry";

describe("resolveQuickAddPantryAction", () => {
  it("maps dictionary flour to flour starter", () => {
    const action = resolveQuickAddPantryAction({ name: "all purpose flour", quantity: 100, unit: "g" });
    expect(action).toEqual({ kind: "starter", starterKey: "flour" });
  });

  it("maps canonical key on ingredient to starter", () => {
    const action = resolveQuickAddPantryAction({
      name: "EVOO",
      canonicalKey: "olive_oil",
      quantity: 1,
      unit: "tbsp",
    });
    expect(action).toEqual({ kind: "starter", starterKey: "olive_oil" });
  });

  it("falls back to custom item for unknown ingredients", () => {
    const action = resolveQuickAddPantryAction({ name: "tahini", quantity: 2, unit: "tbsp" });
    expect(action.kind).toBe("custom");
    if (action.kind === "custom") {
      expect(action.displayName).toBe("tahini");
      expect(action.suggestedAliases).toContain("tahini");
    }
  });
});
