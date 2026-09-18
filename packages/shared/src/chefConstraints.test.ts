import { describe, expect, it } from "vitest";
import { CHEF_SERVING_WEIGHT_G, chefServingWeightG, chefServingWeightHint } from "./chefConstraints";

describe("chefConstraints", () => {
  it("returns typical cooked weight ranges by meal type", () => {
    expect(CHEF_SERVING_WEIGHT_G.main).toEqual({ min: 350, max: 550 });
    expect(CHEF_SERVING_WEIGHT_G.side).toEqual({ min: 150, max: 250 });
    expect(CHEF_SERVING_WEIGHT_G.snack).toEqual({ min: 80, max: 150 });
  });

  it("formats a serving-weight hint for the prompt", () => {
    expect(chefServingWeightHint("main")).toBe("350–550");
    expect(chefServingWeightHint("side")).toBe("150–250");
    expect(chefServingWeightHint("snack")).toBe("80–150");
  });

  it("returns the midpoint cooked weight for a serving", () => {
    expect(chefServingWeightG("main")).toBe(450);
    expect(chefServingWeightG("side")).toBe(200);
    expect(chefServingWeightG("snack")).toBe(115);
  });
});
