import type { Env } from '../types/env';
import type { SeoMetrics } from '../types/domain';
import { SeoMetricsSchema } from '../types/domain';
import { cacheGet, cacheSet, seoMetricsCacheKey } from './kv-cache';
import { SeoApiError } from './seo/errors';
import type { SeoProvider } from './seo/provider';
import { createMockProvider } from './seo/mock-provider';
import { createAhrefsProvider } from './seo/ahrefs-provider';

/**
 * SEO data layer: selects a provider (mock by default, Ahrefs in prod), wraps it
 * with KV caching and exponential-backoff retry. Providers are swappable via the
 * SEO_PROVIDER env var without touching callers.
 */

const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24h
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 10_000;
const RETRY_AFTER_MS = 2_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number): number {
  const jitter = Math.floor(Math.random() * 200);
  return Math.min(BASE_BACKOFF_MS * Math.pow(2, attempt) + jitter, MAX_BACKOFF_MS);
}

/** Choose the SEO provider from env (defaults to the deterministic mock). */
export function selectProvider(env: Env): SeoProvider {
  const which = (env.SEO_PROVIDER ?? 'mock').toLowerCase();
  switch (which) {
    case 'ahrefs':
      return createAhrefsProvider(env.SEO_API_KEY);
    case 'mock':
    default:
      return createMockProvider();
  }
}

/**
 * Fetch SEO metrics for a domain with KV caching and exponential-backoff retry.
 *
 * @throws Error('SEO_API_EXHAUSTED') when all retries are exhausted.
 */
export async function fetchSeoMetrics(env: Env, domainName: string): Promise<SeoMetrics> {
  const kv = env.SEO_CACHE;
  const cacheKey = seoMetricsCacheKey(domainName);

  const cached = await cacheGet<SeoMetrics>(kv, cacheKey);
  if (cached) {
    const parsed = SeoMetricsSchema.safeParse(cached);
    if (parsed.success) return parsed.data;
    // Fall through and refetch if the cached shape is invalid.
  }

  const provider = selectProvider(env);

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const metrics = await provider.fetchMetrics(domainName);
      const validated = SeoMetricsSchema.parse(metrics);
      await cacheSet(kv, cacheKey, validated, CACHE_TTL_SECONDS);
      return validated;
    } catch (err) {
      lastError = err;
      if (attempt === MAX_RETRIES) break;

      if (err instanceof SeoApiError && err.statusCode === 429) {
        // Respect the Retry-After signal, then continue retrying.
        await sleep(err.retryAfterMs ?? RETRY_AFTER_MS);
        continue;
      }
      if (err instanceof SeoApiError && err.statusCode >= 500) {
        await sleep(backoffDelay(attempt));
        continue;
      }
      // Non-retryable (e.g. 4xx auth/bad request): stop immediately.
      break;
    }
  }

  throw new Error('SEO_API_EXHAUSTED', { cause: lastError });
}
