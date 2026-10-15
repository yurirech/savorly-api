import { describe, expect, it } from "vitest";
import { mergeRemoteDay, resolveLocalDiaryDay, seedDayFromSource } from "./diaryLocal";
import type { DiaryDayResponse, DiaryEntry, DiaryMealGroup } from "./types";

const totals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

function ids(): () => string {
  let n = 0;
  return () => `local-${++n}`;
}

function meal(input: Partial<DiaryMealGroup> & Pick<DiaryMealGroup, "id" | "name">): DiaryMealGroup {
  return {
    date: "2026-10-14",
    sortOrder: 0,
    totals,
    entries: [],
    ...input,
  };
}

function entry(input: Partial<DiaryEntry> & Pick<DiaryEntry, "id" | "mealId">): DiaryEntry {
  return {
    date: "2026-10-15",
    kind: "food",
    foodId: "food-1",
    foodName: "Oats",
    grams: 40,
    nutrients: { kcal: 150, proteinG: 5, carbsG: 27, fatG: 3 },
    createdAt: "2026-10-15T07:00:00.000Z",
    ...input,
  };
}

function day(date: string, meals: DiaryMealGroup[]): DiaryDayResponse {
  return { date, meals, totals, remaining: null, targets: null };
}

describe("resolveLocalDiaryDay", () => {
  it("seeds today from yesterday meal names without waiting on a fetch", () => {
    const yesterday = day("2026-10-14", [
      meal({ id: "y-b", name: "Breakfast", sortOrder: 0, stapleCount: 2, entries: [entry({ id: "old", mealId: "y-b", date: "2026-10-14" })] }),
      meal({ id: "y-l", name: "Lunch", sortOrder: 1 }),
    ]);

    const painted = resolveLocalDiaryDay("2026-10-15", null, [yesterday], ids());

    expect(painted.day.meals.map((row) => row.name)).toEqual(["Breakfast", "Lunch"]);
    expect(painted.day.meals.every((row) => row.entries.length === 0)).toBe(true);
    expect(painted.day.meals[0]?.id).toBe("local-1");
    expect(painted.day.meals[0]?.stapleCount).toBe(2);
    expect(painted.day.meals[0]?.canCopyPrevious).toBe(true);
    expect(painted.seededMeals).toEqual([
      { id: "local-1", name: "Breakfast" },
      { id: "local-2", name: "Lunch" },
    ]);
  });

  it("keeps an existing cached day instead of reseeding", () => {
    const cached = day("2026-10-15", [meal({ id: "today-b", name: "Breakfast", date: "2026-10-15" })]);
    const painted = resolveLocalDiaryDay("2026-10-15", cached, [], ids());
    expect(painted.seededMeals).toEqual([]);
    expect(painted.day).toBe(cached);
  });

  it("paints an empty day when the phone has no past meals", () => {
    const painted = seedDayFromSource("2026-10-15", null, ids());
    expect(painted.day.meals).toEqual([]);
    expect(painted.seededMeals).toEqual([]);
  });
});

describe("mergeRemoteDay", () => {
  it("keeps a local-only entry when remote meal ids differ", () => {
    const localBreakfast = "local-b";
    const local = day("2026-10-15", [
      meal({
        id: localBreakfast,
        name: "Breakfast",
        date: "2026-10-15",
        entries: [entry({ id: "pending-oats", mealId: localBreakfast })],
      }),
      meal({ id: "local-l", name: "Lunch", date: "2026-10-15", sortOrder: 1 }),
    ]);
    const remote = day("2026-10-15", [
      meal({ id: "server-b", name: "Breakfast", date: "2026-10-15" }),
      meal({ id: "server-l", name: "Lunch", date: "2026-10-15", sortOrder: 1 }),
    ]);

    const { day: merged, mealIdMap } = mergeRemoteDay(local, remote);

    expect(mealIdMap).toEqual({ "local-b": "server-b", "local-l": "server-l" });
    const breakfast = merged.meals.find((row) => row.name === "Breakfast");
    expect(breakfast?.id).toBe("server-b");
    expect(breakfast?.entries).toEqual([
      expect.objectContaining({ id: "pending-oats", mealId: "server-b", foodName: "Oats" }),
    ]);
  });

  it("keeps a food logged locally after a late remote day with new meal ids", () => {
    const yesterday = day("2026-10-14", [meal({ id: "y-b", name: "Breakfast", stapleCount: 1 })]);
    const painted = resolveLocalDiaryDay("2026-10-15", null, [yesterday], ids());
    const mealId = painted.day.meals[0]?.id ?? "";
    const logged: DiaryDayResponse = {
      ...painted.day,
      meals: painted.day.meals.map((row) =>
        row.id === mealId ? { ...row, entries: [entry({ id: "local-entry", mealId })] } : row,
      ),
    };
    const remote = day("2026-10-15", [meal({ id: "server-b", name: "Breakfast", date: "2026-10-15" })]);
    const { day: merged } = mergeRemoteDay(logged, remote);
    expect(merged.meals[0]?.entries).toEqual([
      expect.objectContaining({ id: "local-entry", mealId: "server-b", foodName: "Oats" }),
    ]);
  });

  it("keeps a locally created meal the server does not have yet", () => {
    const local = day("2026-10-15", [
      meal({ id: "local-b", name: "Breakfast", date: "2026-10-15" }),
      meal({ id: "local-brunch", name: "Brunch", date: "2026-10-15", sortOrder: 1 }),
    ]);
    const remote = day("2026-10-15", [meal({ id: "server-b", name: "Breakfast", date: "2026-10-15" })]);

    const { day: merged } = mergeRemoteDay(local, remote);
    expect(merged.meals.map((row) => row.name)).toEqual(["Breakfast", "Brunch"]);
    expect(merged.meals[1]?.id).toBe("local-brunch");
  });
});
