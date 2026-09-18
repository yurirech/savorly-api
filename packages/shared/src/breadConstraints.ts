import type { BreadLoafSize } from "./recipe";

export const BREAD_LOAF_WEIGHT_G = {
  medium: 750,
  large: 1000,
} as const;

export const BREAD_SLICE_G = 40;

export function breadLoafWeightG(size: BreadLoafSize): number {
  return BREAD_LOAF_WEIGHT_G[size];
}

export function breadDefaultServings(size: BreadLoafSize): number {
  return size === "large" ? 16 : 12;
}
