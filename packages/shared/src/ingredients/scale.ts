export function scaleFactor(originalServings: number | null | undefined, displayServings: number): number {
  if (!originalServings || originalServings <= 0 || !Number.isFinite(displayServings)) {
    return 1;
  }
  return displayServings / originalServings;
}

export function scaleQuantity(quantity: number | null | undefined, factor: number): number | null {
  if (quantity == null || !Number.isFinite(quantity)) {
    return quantity ?? null;
  }
  return quantity * factor;
}
