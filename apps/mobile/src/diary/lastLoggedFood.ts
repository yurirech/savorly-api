export type LastLoggedFood = {
  foodId: string;
  grams: number;
  mealId: string;
};

let pending: LastLoggedFood | null = null;

export function writeLastLoggedFood(entry: LastLoggedFood): void {
  pending = entry;
}

export function takeLastLoggedFood(): LastLoggedFood | null {
  const next = pending;
  pending = null;
  return next;
}
