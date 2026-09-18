import type { BakeKind } from "./recipe";

export const BAKE_DEFAULT_SERVINGS = {
  cake: 12,
  muffin: 12,
  cupcake: 12,
  other: 8,
} as const;

export const BAKE_SERVING_G = {
  cake: 90,
  muffin: 70,
  cupcake: 55,
  other: 80,
} as const;

export function bakeDefaultServings(kind: BakeKind): number {
  return BAKE_DEFAULT_SERVINGS[kind];
}

export function bakeServingG(kind: BakeKind): number {
  return BAKE_SERVING_G[kind];
}
