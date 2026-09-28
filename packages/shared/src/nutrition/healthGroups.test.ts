import { describe, expect, it } from "vitest";
import { dayIntakeTargets, healthGroupPercent, HEALTH_GROUPS, macroCalorieShares } from "./healthGroups";
import type { NutrientVector } from "./nutrients";

const emptyTotals: NutrientVector = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

describe("health groups", () => {
  it("uses profile macros and derives saturated fat and fiber from calories", () => {
    const intakes = dayIntakeTargets(
      { bmr: 1, tdee: 1, dailyKcalDelta: 0, kcal: 2000, proteinG: 150, carbsG: 200, fatG: 67 },
      "female",
    );
    expect(intakes.proteinG).toBe(150);
    expect(intakes.saturatedFatG).toBe(22.2);
    expect(intakes.fiberG).toBe(28);
    expect(intakes.ironMg).toBe(18);
  });

  it("ignores nutrients that have no amount when scoring a group", () => {
    const energy = HEALTH_GROUPS.find((group) => group.id === "energy");
    expect(energy).toBeDefined();
    const totals: NutrientVector = {
      ...emptyTotals,
      thiaminMg: 1.2,
      riboflavinMg: 1.3,
    };
    const intakes = dayIntakeTargets(null, "male");
    expect(healthGroupPercent(totals, energy!, intakes)).toBe(100);
  });

  it("splits macro calories into shares", () => {
    const shares = macroCalorieShares({ proteinG: 25, carbsG: 50, fatG: 11.1 });
    expect(shares.protein + shares.carbs + shares.fat).toBeCloseTo(1);
  });
});
