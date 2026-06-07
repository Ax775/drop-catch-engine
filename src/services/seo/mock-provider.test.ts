import { describe, it, expect } from 'vitest';
import { hashDomain, generateMetrics, createMockProvider } from './mock-provider';
import { HIGH_VALUE_TLDS } from '../scorer';
import { SeoApiError } from './errors';

describe('hashDomain', () => {
  it('is deterministic', () => {
    expect(hashDomain('example.com')).toBe(hashDomain('example.com'));
  });

  it('is case-insensitive', () => {
    expect(hashDomain('Example.COM')).toBe(hashDomain('example.com'));
  });

  it('differs for different inputs', () => {
    expect(hashDomain('a.com')).not.toBe(hashDomain('b.com'));
  });
});

describe('generateMetrics', () => {
  it('returns the same metrics for the same domain', () => {
    expect(generateMetrics('vintage-coffee.com')).toEqual(generateMetrics('vintage-coffee.com'));
  });

  it('keeps da_score within 0..100 and backlinks within 0..4999', () => {
    for (const d of ['a.com', 'foo.io', 'bar.dev', 'really-long-domain-name.co.uk']) {
      const m = generateMetrics(d);
      expect(m.da_score).toBeGreaterThanOrEqual(0);
      expect(m.da_score).toBeLessThanOrEqual(100);
      expect(m.backlink_count).toBeGreaterThanOrEqual(0);
      expect(m.backlink_count).toBeLessThan(5000);
      expect(Array.isArray(m.source_authority_links)).toBe(true);
      expect(m.source_authority_links.length).toBeLessThanOrEqual(5);
    }
  });

  it('only ever emits authority links ending in a known high-value TLD or a .com linker', () => {
    const m = generateMetrics('healthtracker.edu');
    for (const link of m.source_authority_links) {
      const isAuthority = HIGH_VALUE_TLDS.some((t) => link.endsWith(t));
      const isLinker = /^linker-\d+\.com$/.test(link);
      expect(isAuthority || isLinker).toBe(true);
    }
  });
});

describe('createMockProvider', () => {
  it('returns deterministic metrics when no failure is rolled', async () => {
    // random() = 0.9 -> above failure thresholds; latency disabled for speed.
    const provider = createMockProvider({ random: () => 0.9, minLatencyMs: 0, maxLatencyMs: 0 });
    const m = await provider.fetchMetrics('example.com');
    expect(m).toEqual(generateMetrics('example.com'));
    expect(provider.name).toBe('mock');
  });

  it('throws a retryable 429 when the failure roll is low', async () => {
    const provider = createMockProvider({ random: () => 0.0, minLatencyMs: 0, maxLatencyMs: 0 });
    await expect(provider.fetchMetrics('example.com')).rejects.toMatchObject({
      statusCode: 429,
    });
    await expect(provider.fetchMetrics('example.com')).rejects.toBeInstanceOf(SeoApiError);
  });

  it('throws a 503 in the 0.15..0.20 roll band', async () => {
    const provider = createMockProvider({ random: () => 0.17, minLatencyMs: 0, maxLatencyMs: 0 });
    await expect(provider.fetchMetrics('example.com')).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});
