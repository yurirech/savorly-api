import { describe, expect, it } from "vitest";
import { resolveCreamiSweetenerName } from "./creamiSweetener";

describe("resolveCreamiSweetenerName", () => {
  it("defaults lightweight to stevia when blank", () => {
    expect(resolveCreamiSweetenerName("lightweight")).toBe("stevia");
    expect(resolveCreamiSweetenerName("lightweight", "")).toBe("stevia");
    expect(resolveCreamiSweetenerName("lightweight", "   ")).toBe("stevia");
    expect(resolveCreamiSweetenerName("lightweight", null)).toBe("stevia");
  });

  it("defaults bulky to xylitol when blank", () => {
    expect(resolveCreamiSweetenerName("bulky")).toBe("xylitol");
    expect(resolveCreamiSweetenerName("bulky", "")).toBe("xylitol");
    expect(resolveCreamiSweetenerName("bulky", "   ")).toBe("xylitol");
    expect(resolveCreamiSweetenerName("bulky", null)).toBe("xylitol");
  });

  it("keeps a named lightweight sweetener", () => {
    expect(resolveCreamiSweetenerName("lightweight", "liquid stevia")).toBe("liquid stevia");
    expect(resolveCreamiSweetenerName("lightweight", "  monk fruit  ")).toBe("monk fruit");
  });

  it("keeps a named bulky sweetener", () => {
    expect(resolveCreamiSweetenerName("bulky", "erythritol")).toBe("erythritol");
    expect(resolveCreamiSweetenerName("bulky", "  allulose  ")).toBe("allulose");
  });
});
