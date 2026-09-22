export type NutritionSex = "male" | "female";
export type NutritionActivity = "sedentary" | "light" | "moderate" | "active";
export type NutritionGoal = "lose" | "maintain" | "gain";

export type NutritionProfileInput = {
  sex: NutritionSex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: NutritionActivity;
  goal: NutritionGoal;
  weeklyKgChange: number;
};

export type NutritionTargets = {
  bmr: number;
  tdee: number;
  dailyKcalDelta: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export const MIN_CALORIE_TARGET = 1200;
export const KCAL_PER_KG = 7700;

const ACTIVITY_FACTOR: Record<NutritionActivity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

export function mifflinStJeorBmr(input: Pick<NutritionProfileInput, "sex" | "age" | "heightCm" | "weightKg">): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return Math.round(input.sex === "male" ? base + 5 : base - 161);
}

export function dailyKcalDelta(goal: NutritionGoal, weeklyKgChange: number): number {
  if (goal === "maintain") {
    return 0;
  }
  const magnitude = Math.abs(weeklyKgChange) * (KCAL_PER_KG / 7);
  const signed = goal === "lose" ? -magnitude : magnitude;
  return Math.round(signed);
}

export function computeNutritionTargets(profile: NutritionProfileInput): NutritionTargets {
  const bmr = mifflinStJeorBmr(profile);
  const tdee = Math.round(bmr * ACTIVITY_FACTOR[profile.activity]);
  const delta = dailyKcalDelta(profile.goal, profile.weeklyKgChange);
  const kcal = Math.max(MIN_CALORIE_TARGET, tdee + delta);
  return {
    bmr,
    tdee,
    dailyKcalDelta: delta,
    kcal,
    proteinG: Math.round((kcal * 0.3) / 4),
    carbsG: Math.round((kcal * 0.4) / 4),
    fatG: Math.round((kcal * 0.3) / 9),
  };
}
