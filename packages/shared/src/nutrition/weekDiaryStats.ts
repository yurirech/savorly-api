export type WeekStatDay = {
  date: string;
  eatenKcal: number;
  complete: boolean;
};

export function isCountableWeekDay(day: WeekStatDay, today: string, selected: ReadonlySet<string>): boolean {
  return selected.has(day.date) && day.date <= today && day.complete && day.eatenKcal > 0;
}

export function defaultSelectedWeekDays(days: WeekStatDay[], today: string): string[] {
  return days.filter((day) => day.date <= today && day.complete && day.eatenKcal > 0).map((day) => day.date);
}

export function weekCountedStats(days: WeekStatDay[], today: string, selected: Iterable<string>) {
  const selectedSet = selected instanceof Set ? selected : new Set(selected);
  const counted = days.filter((day) => isCountableWeekDay(day, today, selectedSet));
  const eatenKcal = counted.reduce((sum, day) => sum + day.eatenKcal, 0);
  return {
    eatenKcal,
    countedDays: counted.length,
    averageKcal: counted.length === 0 ? null : Math.round(eatenKcal / counted.length),
  };
}

export function mealsMakeCompleteDay(mealCount: number, mealsWithEntries: number): boolean {
  return mealCount > 0 && mealsWithEntries === mealCount;
}
