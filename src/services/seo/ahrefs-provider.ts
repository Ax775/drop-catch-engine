import type { SeoMetrics } from '../../types/domain';
import { SeoApiError } from './errors';
import type { SeoProvider } from './provider';

const AHREFS_BASE = 'https://api.ahrefs.com/v3';

/** Shape of the subset of the Ahrefs response we consume. */
interface AhrefsDomainRating {
  domain_rating?: number;
}
interface AhrefsBacklinkRow {
  domain_from?: string;
}
interface AhrefsResponse {
  domain_rating?: AhrefsDomainRating;
  metrics?: { backlinks?: number };
  refdomains?: AhrefsBacklinkRow[];
}

function clampDa(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Real SEO provider backed by the Ahrefs API. Mirrors the mock's SeoMetrics
 * contract so it is a drop-in replacement. Maps HTTP 429/503 to a retryable
 * SeoApiError so the shared retry/backoff layer handles throttling.
 *
 * Enable by setting `SEO_PROVIDER=ahrefs` and providing a valid `SEO_API_KEY`.
 */
export function createAhrefsProvider(apiKey: string): SeoProvider {
  return {
    name: 'ahrefs',
    async fetchMetrics(domainName: string): Promise<SeoMetrics> {
      const url = new URL(`${AHREFS_BASE}/site-explorer/overview`);
      url.searchParams.set('target', domainName);
      url.searchParams.set('mode', 'domain');

      let res: Response;
      try {
        res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
          },
        });
      } catch (err) {
        // Network-level failure — retryable.
        throw new SeoApiError(
          err instanceof Error ? err.message : 'Network error',
          503,
        );
      }

      if (res.status === 429) {
        const retryAfter = Number.parseInt(res.headers.get('Retry-After') ?? '', 10);
        throw new SeoApiError('Ahrefs rate limited', 429, Number.isFinite(retryAfter) ? retryAfter * 1000 : undefined);
      }
      if (res.status >= 500) {
        throw new SeoApiError(`Ahrefs server error ${res.status}`, res.status);
      }
      if (!res.ok) {
        // 4xx (auth, bad request) — not retryable.
        throw new Error(`Ahrefs request failed: ${res.status}`);
      }

      let body: unknown;
      try {
        body = await res.json();
      } catch {
        throw new Error('Ahrefs returned invalid JSON');
      }

      const data = body as AhrefsResponse;
      const links = (data.refdomains ?? [])
        .map((r) => r.domain_from)
        .filter((d): d is string => typeof d === 'string');

      return {
        da_score: clampDa(data.domain_rating?.domain_rating),
        backlink_count: Math.max(0, Math.round(data.metrics?.backlinks ?? 0)),
        source_authority_links: links,
      };
    },
  };
}
