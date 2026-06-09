import type { SeoMetrics } from '../../types/domain';
import { HIGH_VALUE_TLDS } from '../scorer';
import { SeoApiError } from './errors';
import type { SeoProvider } from './provider';

const RETRY_AFTER_MS = 2_000;

// --- Deterministic metric derivation (from the domain hash) ---
const DA_SCORE_MODULO = 101; // da_score in 0..100
const BACKLINK_HASH_MULTIPLIER = 7;
const BACKLINK_MODULO = 5000; // backlink_count in 0..4999
const MAX_SOURCE_LINKS = 6; // 0..5 source links per domain
const AUTHORITY_LINK_VARIANTS = 10;
const AUTHORITY_LINK_THRESHOLD = 3; // variant < 3 => ~30% authority-TLD link
const ORDINARY_LINK_MODULO = 997;

// --- Simulated transient failures (cumulative thresholds on a single roll) ---
const RATE_429_THRESHOLD = 0.15; // 15% Too Many Requests
const RATE_503_THRESHOLD = 0.2; //  next 5% Service Unavailable
const DEFAULT_MIN_LATENCY_MS = 100;
const DEFAULT_MAX_LATENCY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Deterministic 32-bit-ish hash of a domain (sum of char codes with positional
 * weighting). Same input always yields the same hash → consistent metrics.
 * Exported for unit testing.
 */
export function hashDomain(domainName: string): number {
  const chars = Array.from(domainName.toLowerCase());
  return chars.reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1), 0);
}

/**
 * Generate consistent fake SEO metrics derived from the domain hash. Pure and
 * deterministic — exported so tests can assert ranges/shape without timers.
 */
export function generateMetrics(domainName: string): SeoMetrics {
  const hash = hashDomain(domainName);

  const da_score = hash % DA_SCORE_MODULO;
  const backlink_count = (hash * BACKLINK_HASH_MULTIPLIER) % BACKLINK_MODULO;

  const linkCount = hash % MAX_SOURCE_LINKS;
  const links: string[] = [];
  for (let i = 0; i < linkCount; i++) {
    const variant = (hash + i * 13) % AUTHORITY_LINK_VARIANTS;
    if (variant < AUTHORITY_LINK_THRESHOLD) {
      // ~30% chance of a high-value authority TLD
      const tld = HIGH_VALUE_TLDS[(hash + i) % HIGH_VALUE_TLDS.length];
      links.push(`authority-source-${i}${tld}`);
    } else {
      links.push(`linker-${(hash + i) % ORDINARY_LINK_MODULO}.com`);
    }
  }

  return { da_score, backlink_count, source_authority_links: links };
}

export interface MockProviderOptions {
  /** Inject latency/failure randomness for tests (defaults to Math.random). */
  random?: () => number;
  /** Simulated network latency range in ms. Set to 0 to disable (tests). */
  minLatencyMs?: number;
  maxLatencyMs?: number;
}

/**
 * Mock SEO provider modelled on Ahrefs/Moz. Deterministic metrics + simulated
 * latency and transient failures (15% 429, 5% 503) so the retry/backoff layer
 * is exercised. Swap for a real provider in production via env (see seo-api.ts).
 */
export function createMockProvider(options: MockProviderOptions = {}): SeoProvider {
  const rng = options.random ?? Math.random;
  const minLatency = options.minLatencyMs ?? DEFAULT_MIN_LATENCY_MS;
  const maxLatency = options.maxLatencyMs ?? DEFAULT_MAX_LATENCY_MS;

  return {
    name: 'mock',
    async fetchMetrics(domainName: string): Promise<SeoMetrics> {
      const latency = minLatency + Math.floor(rng() * Math.max(0, maxLatency - minLatency));
      if (latency > 0) await sleep(latency);

      const roll = rng();
      if (roll < RATE_429_THRESHOLD) throw new SeoApiError('Too Many Requests', 429, RETRY_AFTER_MS);
      if (roll < RATE_503_THRESHOLD) throw new SeoApiError('Service Unavailable', 503);

      return generateMetrics(domainName);
    },
  };
}
