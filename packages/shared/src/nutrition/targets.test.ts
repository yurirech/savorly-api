import { describe, expect, it } from "vitest";
import { computeNutritionTargets, dailyKcalDelta, mifflinStJeorBmr, MIN_CALORIE_TARGET } from "./targets";

const adultMale = {
  sex: "male" as const,
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activity: "sedentary" as const,
  goal: "maintain" as const,
  weeklyKgChange: 0,
};

describe("mifflinStJeorBmr", () => {
  it("computes adult male BMR", () => {
    expect(mifflinStJeorBmr(adultMale)).toBe(1780);
  });
});

describe("dailyKcalDelta", () => {
  it("is zero when maintaining", () => {
    expect(dailyKcalDelta("maintain", 0.5)).toBe(0);
  });

  it("applies a 0.5 kg/week loss as about 550 kcal", () => {
    expect(dailyKcalDelta("lose", 0.5)).toBe(-550);
  });

  it("applies the same magnitude as a surplus when gaining", () => {
    expect(dailyKcalDelta("gain", 0.5)).toBe(550);
  });
});

describe("computeNutritionTargets", () => {
  it("sets maintain calories to TDEE", () => {
    const targets = computeNutritionTargets(adultMale);
    expect(targets.bmr).toBe(1780);
    expect(targets.tdee).toBe(2136);
    expect(targets.kcal).toBe(2136);
    expect(targets.dailyKcalDelta).toBe(0);
    expect(targets.proteinG).toBe(160);
    expect(targets.carbsG).toBe(214);
    expect(targets.fatG).toBe(71);
  });

  it("subtracts the weekly loss from TDEE", () => {
    const targets = computeNutritionTargets({ ...adultMale, goal: "lose", weeklyKgChange: 0.5 });
    expect(targets.kcal).toBe(1586);
    expect(targets.dailyKcalDelta).toBe(-550);
  });

  it("floors the calorie target", () => {
    const targets = computeNutritionTargets({
      ...adultMale,
      weightKg: 45,
      heightCm: 150,
      activity: "sedentary",
      goal: "lose",
      weeklyKgChange: 2,
    });
    expect(targets.kcal).toBe(MIN_CALORIE_TARGET);
  });
});
