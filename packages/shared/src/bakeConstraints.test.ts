import { describe, expect, it } from "vitest";
import { BAKE_DEFAULT_SERVINGS, BAKE_SERVING_G, bakeDefaultServings, bakeServingG } from "./bakeConstraints";

describe("bakeConstraints", () => {
  it("defaults servings by bake kind", () => {
    expect(BAKE_DEFAULT_SERVINGS.cake).toBe(12);
    expect(BAKE_DEFAULT_SERVINGS.muffin).toBe(12);
    expect(BAKE_DEFAULT_SERVINGS.cupcake).toBe(12);
    expect(BAKE_DEFAULT_SERVINGS.other).toBe(8);
    expect(bakeDefaultServings("cake")).toBe(12);
    expect(bakeDefaultServings("other")).toBe(8);
  });

  it("defaults serving weight by bake kind", () => {
    expect(BAKE_SERVING_G.cake).toBe(90);
    expect(BAKE_SERVING_G.muffin).toBe(70);
    expect(BAKE_SERVING_G.cupcake).toBe(55);
    expect(BAKE_SERVING_G.other).toBe(80);
    expect(bakeServingG("muffin")).toBe(70);
  });
});
