import { describe, it, expect } from 'vitest';
import {
  HIGH_VALUE_TLDS,
  isHighValue,
  scoreDomain,
  estimateValue,
} from './scorer';
import type { SeoMetrics } from '../types/domain';

function metrics(partial: Partial<SeoMetrics>): SeoMetrics {
  return {
    da_score: 0,
    backlink_count: 0,
    source_authority_links: [],
    ...partial,
  };
}

describe('HIGH_VALUE_TLDS', () => {
  it('includes the expected authority TLDs', () => {
    expect(HIGH_VALUE_TLDS).toEqual(
      expect.arrayContaining(['.gov', '.edu', '.nl', '.overheid.nl', '.ac.uk', '.gouv.fr']),
    );
  });
});

describe('isHighValue', () => {
  it('is true when da_score > 25 AND backlink_count > 150', () => {
    expect(isHighValue(metrics({ da_score: 26, backlink_count: 151 }))).toBe(true);
  });

  it('is false at the inclusive boundaries (25 / 150) with no authority links', () => {
    expect(isHighValue(metrics({ da_score: 25, backlink_count: 150 }))).toBe(false);
    expect(isHighValue(metrics({ da_score: 25, backlink_count: 5000 }))).toBe(false);
    expect(isHighValue(metrics({ da_score: 100, backlink_count: 150 }))).toBe(false);
  });

  it('is true when any source link ends with a high-value TLD, regardless of DA/backlinks', () => {
    expect(
      isHighValue(metrics({ da_score: 1, backlink_count: 1, source_authority_links: ['ref.gov'] })),
    ).toBe(true);
    expect(
      isHighValue(metrics({ source_authority_links: ['gemeente.overheid.nl'] })),
    ).toBe(true);
  });

  it('is false for ordinary links and low metrics', () => {
    expect(
      isHighValue(metrics({ da_score: 10, backlink_count: 20, source_authority_links: ['a.com', 'b.io'] })),
    ).toBe(false);
  });

  it('matches TLDs case-insensitively and ignores surrounding whitespace', () => {
    expect(isHighValue(metrics({ source_authority_links: ['  Agency.GOV  '] }))).toBe(true);
  });
});

describe('scoreDomain', () => {
  it('classifies and scores a high-DA / high-backlink domain', () => {
    const result = scoreDomain(metrics({ da_score: 30, backlink_count: 200 }));
    expect(result.status).toBe('high_value');
    // 30*2 + log10(201)*20 + 0
    const expected = 30 * 2 + Math.log10(201) * 20;
    expect(result.score).toBeCloseTo(expected, 2);
  });

  it('adds an authority bonus of 15 per matching link', () => {
    const result = scoreDomain(
      metrics({ da_score: 10, backlink_count: 5, source_authority_links: ['x.gov', 'y.edu', 'z.com'] }),
    );
    // 2 matching links -> bonus 30
    const expected = 10 * 2 + Math.log10(6) * 20 + 30;
    expect(result.score).toBeCloseTo(expected, 2);
    expect(result.status).toBe('high_value'); // authority link present
  });

  it('caps the authority bonus at 60 (≥4 matching links)', () => {
    const links = ['a.gov', 'b.edu', 'c.nl', 'd.ac.uk', 'e.gouv.fr'];
    const result = scoreDomain(metrics({ da_score: 0, backlink_count: 0, source_authority_links: links }));
    // 5 matches would be 75, capped to 60; log10(1)*20 = 0
    expect(result.score).toBeCloseTo(60, 2);
  });

  it('marks a low-value domain as scanned', () => {
    expect(scoreDomain(metrics({ da_score: 5, backlink_count: 10 })).status).toBe('scanned');
  });
});

describe('estimateValue', () => {
  it('applies base + da*8 + min(backlinks*0.3, 2000) + authorityBonus*200', () => {
    // 50 + 30*8 + min(200*0.3, 2000) + 0 = 50 + 240 + 60 = 350
    expect(estimateValue(metrics({ da_score: 30, backlink_count: 200 }))).toBe(350);
  });

  it('caps the backlink contribution at 2000', () => {
    // 50 + 0 + min(10000*0.3=3000, 2000) + 0 = 2050
    expect(estimateValue(metrics({ da_score: 0, backlink_count: 10000 }))).toBe(2050);
  });

  it('adds 200 EUR per authority link', () => {
    // 50 + 10*8 + min(5*0.3=1.5,2000) + 2*200 = 50 + 80 + 1.5 + 400 = 531.5 -> 532
    expect(
      estimateValue(metrics({ da_score: 10, backlink_count: 5, source_authority_links: ['a.gov', 'b.edu'] })),
    ).toBe(532);
  });

  it('returns an integer', () => {
    const v = estimateValue(metrics({ da_score: 7, backlink_count: 13 }));
    expect(Number.isInteger(v)).toBe(true);
  });
});
