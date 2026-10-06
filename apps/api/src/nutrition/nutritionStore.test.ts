import { describe, expect, it } from "vitest";
import { scaleNutrition } from "@savorly/shared";
import { asIsoDate, buildRelocatePairs, diaryFromRow, foodFromRow, parseIsoDate, profileResponse } from "./nutritionStore";

describe("parseIsoDate", () => {
  it("accepts YYYY-MM-DD", () => {
    expect(parseIsoDate("2026-09-22")).toBe("2026-09-22");
  });

  it("rejects junk", () => {
    expect(() => parseIsoDate("22/09/2026")).toThrow("Date must be YYYY-MM-DD.");
  });
});

describe("asIsoDate", () => {
  it("slices date strings and ISO dates", () => {
    expect(asIsoDate("2026-09-22")).toBe("2026-09-22");
    expect(asIsoDate(new Date("2026-09-22T12:00:00.000Z"))).toBe("2026-09-22");
  });
});

describe("food and diary mapping", () => {
  it("maps a food row and snapshots scaled nutrients", () => {
    const now = new Date("2026-09-22T12:00:00.000Z");
    const per100g = { kcal: 588, proteinG: 25, carbsG: 20, fatG: 50 };
    const food = foodFromRow({
      id: "00000000-0000-0000-0000-000000000001",
      userId: "00000000-0000-0000-0000-000000000002",
      name: "Peanut butter",
      originalName: "Peanut butter",
      source: "manual",
      fdcId: null,
      nevoCode: null,
      nutritionRecipeId: null,
      servingWeightG: 32,
      per100g,
      createdAt: now,
      updatedAt: now,
    });
    expect(food.per100g.kcal).toBe(588);
    expect(food.servingWeightG).toBe(32);
    expect(food.fatsecretId).toBeNull();

    const fatsecret = foodFromRow({
      id: "00000000-0000-0000-0000-000000000011",
      userId: "00000000-0000-0000-0000-000000000002",
      name: "Banana",
      originalName: "Banana",
      source: "fatsecret",
      fdcId: 9040,
      nevoCode: null,
      nutritionRecipeId: null,
      servingWeightG: null,
      per100g,
      createdAt: now,
      updatedAt: now,
    });
    expect(fatsecret.fdcId).toBeNull();
    expect(fatsecret.fatsecretId).toBe(9040);

    const nutrients = scaleNutrition(food.per100g, 12);
    const entry = diaryFromRow(
      {
        id: "00000000-0000-0000-0000-000000000003",
        userId: food.id,
        mealId: "00000000-0000-0000-0000-000000000099",
        foodId: food.id,
        kind: "food",
        label: null,
        date: "2026-09-22",
        grams: 12,
        nutrients,
        createdAt: now,
      },
      food.name,
    );
    expect(entry.nutrients).toEqual({ kcal: 71, proteinG: 3, carbsG: 2.4, fatG: 6 });
    expect(entry.foodName).toBe("Peanut butter");
    expect(entry.kind).toBe("food");

    const quick = diaryFromRow(
      {
        id: "00000000-0000-0000-0000-000000000004",
        userId: food.id,
        mealId: "00000000-0000-0000-0000-000000000099",
        foodId: null,
        kind: "quick",
        label: "Office lunch",
        date: "2026-09-22",
        grams: 100,
        nutrients: { kcal: 450, proteinG: 20, carbsG: 40, fatG: 15 },
        createdAt: now,
      },
      "Office lunch",
    );
    expect(quick.kind).toBe("quick");
    expect(quick.foodId).toBeNull();
    expect(quick.foodName).toBe("Office lunch");
  });
});

describe("profileResponse", () => {
  it("computes targets when a profile exists", () => {
    const response = profileResponse({
      sex: "male",
      age: 30,
      heightCm: 180,
      weightKg: 80,
      activity: "sedentary",
      goal: "maintain",
      weeklyKgChange: 0,
      updatedAt: "2026-09-22T00:00:00.000Z",
    });
    expect(response.targets?.kcal).toBe(2136);
  });

  it("returns null targets without a profile", () => {
    expect(profileResponse(null).targets).toBeNull();
  });
});

describe("buildRelocatePairs", () => {
  it("copies one food to two groups on another date", () => {
    expect(
      buildRelocatePairs([{ id: "banana", mealId: "today-breakfast" }], [
        { id: "tomorrow-lunch" },
        { id: "tomorrow-dinner" },
      ]),
    ).toEqual([
      { entryId: "banana", mealId: "tomorrow-lunch" },
      { entryId: "banana", mealId: "tomorrow-dinner" },
    ]);
  });

  it("moves several foods onto one group", () => {
    expect(
      buildRelocatePairs(
        [
          { id: "milk", mealId: "today-breakfast" },
          { id: "oats", mealId: "today-breakfast" },
        ],
        [{ id: "tomorrow-lunch" }],
      ),
    ).toEqual([
      { entryId: "milk", mealId: "tomorrow-lunch" },
      { entryId: "oats", mealId: "tomorrow-lunch" },
    ]);
  });

  it("returns no pairs when every target is the source meal", () => {
    expect(buildRelocatePairs([{ id: "banana", mealId: "breakfast" }], [{ id: "breakfast" }])).toEqual([]);
  });

  it("skips the source meal and keeps the other group on the same day", () => {
    expect(
      buildRelocatePairs([{ id: "banana", mealId: "breakfast" }], [{ id: "breakfast" }, { id: "lunch" }]),
    ).toEqual([{ entryId: "banana", mealId: "lunch" }]);
  });
});
