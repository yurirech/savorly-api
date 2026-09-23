import type { UserFood } from "@savorly/shared";

const cache = new Map<string, UserFood>();

export function setCachedFood(food: UserFood): void {
  cache.set(food.id, food);
}

export function getCachedFood(id: string): UserFood | undefined {
  return cache.get(id);
}

export function clearCachedFood(id: string): void {
  cache.delete(id);
}
