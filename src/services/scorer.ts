import type { SeoMetrics } from '../types/domain';

/**
 * TLDs that confer outsized authority for backlink arbitrage. A source link is
 * considered high-value if it ends with any of these suffixes.
 */
export const HIGH_VALUE_TLDS: readonly string[] = [
  '.gov',
  '.edu',
  '.nl',
  '.overheid.nl',
  '.ac.uk',
  '.gouv.fr',
];

/**
 * Count how many source authority links match a high-value TLD.
 */
function authorityLinkMatches(links: string[]): number {
  return links.filter((link) => {
    const normalized = link.trim().toLowerCase();
    return HIGH_VALUE_TLDS.some((tld) => normalized.endsWith(tld));
  }).length;
}

/**
 * A domain is high value when it has both strong authority and link volume, OR
 * when any single backlink originates from a high-value TLD.
 */
export function isHighValue(metrics: SeoMetrics): boolean {
  if (metrics.da_score > 25 && metrics.backlink_count > 150) return true;
  return authorityLinkMatches(metrics.source_authority_links) > 0;
}

export interface ScoreResult {
  status: 'high_value' | 'scanned';
  score: number;
}

/**
 * Produce a numeric quality score and a status classification.
 *
 * score = (da_score * 2)
 *       + (log10(backlink_count + 1) * 20)
 *       + authorityLinkBonus
 * authorityLinkBonus = (matching authority links * 15), capped at 60.
 */
export function scoreDomain(metrics: SeoMetrics): ScoreResult {
  const authorityBonus = Math.min(authorityLinkMatches(metrics.source_authority_links) * 15, 60);
  const score =
    metrics.da_score * 2 +
    Math.log10(metrics.backlink_count + 1) * 20 +
    authorityBonus;
  return {
    status: isHighValue(metrics) ? 'high_value' : 'scanned',
    score: Math.round(score * 100) / 100,
  };
}

/**
 * Estimate the market value of the domain in EUR.
 *
 * base 50 + da_score*8 + min(backlink_count*0.3, 2000) + authorityBonus*200
 */
export function estimateValue(metrics: SeoMetrics): number {
  const authorityBonus = authorityLinkMatches(metrics.source_authority_links);
  const value =
    50 +
    metrics.da_score * 8 +
    Math.min(metrics.backlink_count * 0.3, 2000) +
    authorityBonus * 200;
  return Math.round(value);
}
