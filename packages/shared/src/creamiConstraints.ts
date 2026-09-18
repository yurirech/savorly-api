export const CREAMI_PINT_FILL_G = { small: 450, big: 600 } as const;
export const CREAMI_SUGAR_G = { small: 15, big: 20 } as const;
export const CREAMI_FILL_TOLERANCE_G = 15;
export const CREAMI_XANTHAN_G_PER_450 = { min: 0.5, max: 2 } as const;

export type CreamiPintSize = keyof typeof CREAMI_PINT_FILL_G;

export function creamiPintFillG(size: CreamiPintSize): number {
  return CREAMI_PINT_FILL_G[size];
}

export function creamiSugarG(size: CreamiPintSize): number {
  return CREAMI_SUGAR_G[size];
}

export function creamiXanthanRangeG(size: CreamiPintSize): { min: number; max: number } {
  const scale = CREAMI_PINT_FILL_G[size] / CREAMI_PINT_FILL_G.small;
  return {
    min: CREAMI_XANTHAN_G_PER_450.min * scale,
    max: CREAMI_XANTHAN_G_PER_450.max * scale,
  };
}
