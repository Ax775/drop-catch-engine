/**
 * Shared display formatters. Consolidates the EUR formatting that was previously
 * copy-pasted across App, DomainTable, DeployModal and ROICalculator.
 */

const EUR = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/** Format a EUR amount with no decimals; renders an em dash for null/undefined. */
export function formatEur(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return EUR.format(value);
}
