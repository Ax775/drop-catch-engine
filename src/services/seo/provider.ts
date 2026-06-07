import type { SeoMetrics } from '../../types/domain';

/**
 * A pluggable SEO data source. Implementations fetch raw authority metrics for
 * a single domain; caching and retry/backoff are handled one layer up in
 * seo-api.ts, so providers stay thin and focused on the upstream call.
 */
export interface SeoProvider {
  /** Stable identifier, surfaced in logs. */
  readonly name: string;
  /**
   * Fetch metrics for a domain. May throw `SeoApiError` (see ./errors) to drive
   * the caller's retry/backoff, or any Error for non-retryable failures.
   */
  fetchMetrics(domainName: string): Promise<SeoMetrics>;
}
