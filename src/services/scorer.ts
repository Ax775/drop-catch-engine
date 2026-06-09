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
 * Scoring weights and thresholds. Centralised so the model can be tuned in one
 * place and so the numbers are self-documenting at each call site.
 */
// isHighValue: a domain qualifies on strong DA *and* link volume (strictly above).
const HIGH_VALUE_DA_THRESHOLD = 25;
const HIGH_VALUE_BACKLINK_THRESHOLD = 150;
// scoreDomain weights.
const DA_SCORE_WEIGHT = 2;
const BACKLINK_LOG_WEIGHT = 20;
const AUTHORITY_LINK_BONUS = 15;
const AUTHORITY_BONUS_CAP = 60;
// estimateValue (EUR) coefficients.
const VALUE_BASE_EUR = 50;
const VALUE_DA_MULTIPLIER = 8;
const VALUE_BACKLINK_MULTIPLIER = 0.3;
const VALUE_BACKLINK_CAP_EUR = 2000;
const VALUE_AUTHORITY_LINK_EUR = 200;

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
  if (
    metrics.da_score > HIGH_VALUE_DA_THRESHOLD &&
    metrics.backlink_count > HIGH_VALUE_BACKLINK_THRESHOLD
  ) {
    return true;
  }
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
  const authorityBonus = Math.min(
    authorityLinkMatches(metrics.source_authority_links) * AUTHORITY_LINK_BONUS,
    AUTHORITY_BONUS_CAP,
  );
  const score =
    metrics.da_score * DA_SCORE_WEIGHT +
    Math.log10(metrics.backlink_count + 1) * BACKLINK_LOG_WEIGHT +
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
    VALUE_BASE_EUR +
    metrics.da_score * VALUE_DA_MULTIPLIER +
    Math.min(metrics.backlink_count * VALUE_BACKLINK_MULTIPLIER, VALUE_BACKLINK_CAP_EUR) +
    authorityBonus * VALUE_AUTHORITY_LINK_EUR;
  return Math.round(value);
}
