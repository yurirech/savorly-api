import { describe, expect, it } from "vitest";
import {
  buildDiaryMeals,
  coerceDiaryDayResponse,
  dayTotalsFromMeals,
  LEGACY_DIARY_GENERAL_MEAL_ID,
  mealTotalsFromEntries,
} from "./diaryMeals";
import type { DiaryEntry } from "./types";

const entry = (id: string, mealId: string, kcal: number): DiaryEntry => ({
  id,
  date: "2026-09-22",
  mealId,
  kind: "food",
  foodId: "food-1",
  foodName: "Test",
  grams: 100,
  nutrients: { kcal, proteinG: 1, carbsG: 2, fatG: 3 },
  createdAt: "2026-09-22T12:00:00.000Z",
});

describe("mealTotalsFromEntries", () => {
  it("sums nutrients across entries", () => {
    expect(
      mealTotalsFromEntries([entry("1", "m1", 100), entry("2", "m1", 50)]),
    ).toMatchObject({ kcal: 150, proteinG: 2 });
  });
});

describe("buildDiaryMeals", () => {
  it("groups entries and computes per-meal totals", () => {
    const meals = buildDiaryMeals(
      [
        { id: "m1", date: "2026-09-22", name: "Breakfast", sortOrder: 0 },
        { id: "m2", date: "2026-09-22", name: "Lunch", sortOrder: 1 },
      ],
      [entry("1", "m1", 100), entry("2", "m1", 50), entry("3", "m2", 200)],
    );
    expect(meals).toHaveLength(2);
    expect(meals[0]?.totals.kcal).toBe(150);
    expect(meals[1]?.totals.kcal).toBe(200);
    expect(dayTotalsFromMeals(meals).kcal).toBe(350);
  });
});

describe("coerceDiaryDayResponse", () => {
  it("wraps legacy top-level entries in a General meal group", () => {
    const legacy = {
      date: "2026-09-22",
      entries: [
        {
          id: "e1",
          foodId: "f1",
          foodName: "Oats",
          grams: 50,
          nutrients: { kcal: 190, proteinG: 6, carbsG: 32, fatG: 4 },
          createdAt: "2026-09-22T08:00:00.000Z",
        },
      ],
      totals: { kcal: 190, proteinG: 6, carbsG: 32, fatG: 4 },
      remaining: null,
      targets: null,
    };
    const day = coerceDiaryDayResponse(legacy);
    expect(day.meals).toHaveLength(1);
    expect(day.meals[0]?.id).toBe(LEGACY_DIARY_GENERAL_MEAL_ID);
    expect(day.meals[0]?.entries).toHaveLength(1);
    expect(day.totals.kcal).toBe(190);
  });

  it("passes through responses that already include meals", () => {
    const modern = {
      date: "2026-09-22",
      meals: [],
      totals: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      remaining: null,
      targets: null,
    };
    expect(coerceDiaryDayResponse(modern).meals).toEqual([]);
  });
});
