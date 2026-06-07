import type { SeoMetrics } from '../../types/domain';
import { HIGH_VALUE_TLDS } from '../scorer';
import { SeoApiError } from './errors';
import type { SeoProvider } from './provider';

const RETRY_AFTER_MS = 2_000;

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

  const da_score = hash % 101; // 0..100
  const backlink_count = (hash * 7) % 5000; // 0..4999

  const linkCount = hash % 6; // 0..5 source links
  const links: string[] = [];
  for (let i = 0; i < linkCount; i++) {
    const variant = (hash + i * 13) % 10;
    if (variant < 3) {
      // ~30% chance of a high-value authority TLD
      const tld = HIGH_VALUE_TLDS[(hash + i) % HIGH_VALUE_TLDS.length];
      links.push(`authority-source-${i}${tld}`);
    } else {
      links.push(`linker-${(hash + i) % 997}.com`);
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
  const minLatency = options.minLatencyMs ?? 100;
  const maxLatency = options.maxLatencyMs ?? 400;

  return {
    name: 'mock',
    async fetchMetrics(domainName: string): Promise<SeoMetrics> {
      const latency = minLatency + Math.floor(rng() * Math.max(0, maxLatency - minLatency));
      if (latency > 0) await sleep(latency);

      const roll = rng();
      if (roll < 0.15) throw new SeoApiError('Too Many Requests', 429, RETRY_AFTER_MS);
      if (roll < 0.2) throw new SeoApiError('Service Unavailable', 503);

      return generateMetrics(domainName);
    },
  };
}
