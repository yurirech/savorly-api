import { describe, expect, it } from "vitest";
import {
  defaultSelectedWeekDays,
  isCountableWeekDay,
  mealsMakeCompleteDay,
  weekCountedStats,
} from "./weekDiaryStats";

const today = "2026-10-02";

function day(
  date: string,
  eatenKcal: number,
  complete: boolean,
): { date: string; eatenKcal: number; complete: boolean } {
  return { date, eatenKcal, complete };
}

describe("weekDiaryStats", () => {
  const days = [
    day("2026-09-28", 1800, true),
    day("2026-09-29", 0, true),
    day("2026-09-30", 2100, false),
    day("2026-10-01", 1900, true),
    day("2026-10-02", 1600, true),
    day("2026-10-03", 2000, true),
    day("2026-10-04", 0, false),
  ];

  it("defaults to complete non-zero days through today", () => {
    expect(defaultSelectedWeekDays(days, today)).toEqual(["2026-09-28", "2026-10-01", "2026-10-02"]);
  });

  it("excludes future, incomplete, zero, and unselected days from the average", () => {
    const selected = new Set(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-03"]);
    expect(isCountableWeekDay(days[0]!, today, selected)).toBe(true);
    expect(isCountableWeekDay(days[1]!, today, selected)).toBe(false);
    expect(isCountableWeekDay(days[2]!, today, selected)).toBe(false);
    expect(isCountableWeekDay(days[5]!, today, selected)).toBe(false);
    expect(weekCountedStats(days, today, selected)).toEqual({
      eatenKcal: 3700,
      countedDays: 2,
      averageKcal: 1850,
    });
  });

  it("returns no average when nothing counts", () => {
    expect(weekCountedStats(days, today, [])).toEqual({
      eatenKcal: 0,
      countedDays: 0,
      averageKcal: null,
    });
  });

  it("treats a day with no meals as incomplete", () => {
    expect(mealsMakeCompleteDay(0, 0)).toBe(false);
    expect(mealsMakeCompleteDay(4, 4)).toBe(true);
    expect(mealsMakeCompleteDay(4, 3)).toBe(false);
  });
});
