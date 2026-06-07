/**
 * Domain value + ROI math, mirroring the worker's scorer.estimateValue() so the
 * dashboard's calculator matches server-side scoring exactly.
 */

/** base 50 + da*8 + min(backlinks*0.3, 2000) + authorityLinks*200, rounded. */
export function estimateMarketValue(
  da: number,
  backlinks: number,
  authorityLinks: number,
): number {
  const value = 50 + da * 8 + Math.min(backlinks * 0.3, 2000) + authorityLinks * 200;
  return Math.round(value);
}

/** ROI as a percentage of acquisition cost; null when cost is non-positive. */
export function roiPercent(value: number, cost: number): number | null {
  if (cost <= 0) return null;
  return ((value - cost) / cost) * 100;
}

/**
 * Break-even in months — per spec: backlinks * 2 / cost * 12
 * (assuming 1 backlink ≈ €2/mo revenue). null when cost is non-positive.
 */
export function breakEvenMonths(backlinks: number, cost: number): number | null {
  if (cost <= 0) return null;
  return ((backlinks * 2) / cost) * 12;
}

/** Same threshold the scorer uses for the "High Value" classification. */
export function isHighValue(da: number, backlinks: number): boolean {
  return da > 25 && backlinks > 150;
}
