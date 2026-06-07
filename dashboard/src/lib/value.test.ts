import { describe, it, expect } from 'vitest';
import { estimateMarketValue, roiPercent, breakEvenMonths, isHighValue } from './value';

describe('estimateMarketValue', () => {
  it('applies base + da*8 + min(backlinks*0.3, 2000) + authorityLinks*200', () => {
    // 50 + 30*8 + 60 + 0 = 350
    expect(estimateMarketValue(30, 200, 0)).toBe(350);
  });

  it('caps the backlink contribution at 2000', () => {
    expect(estimateMarketValue(0, 10000, 0)).toBe(2050);
  });

  it('adds 200 per authority link', () => {
    // 50 + 80 + 1.5 + 400 = 531.5 -> 532
    expect(estimateMarketValue(10, 5, 2)).toBe(532);
  });

  it('matches the worker scorer formula for the default calculator state', () => {
    // da 30, backlinks 200, authority 2 -> 50 + 240 + 60 + 400 = 750
    expect(estimateMarketValue(30, 200, 2)).toBe(750);
  });
});

describe('roiPercent', () => {
  it('computes (value - cost) / cost * 100', () => {
    expect(roiPercent(750, 100)).toBeCloseTo(650, 5);
  });

  it('is negative when value < cost', () => {
    expect(roiPercent(50, 200)).toBeCloseTo(-75, 5);
  });

  it('returns null for non-positive cost', () => {
    expect(roiPercent(750, 0)).toBeNull();
    expect(roiPercent(750, -10)).toBeNull();
  });
});

describe('breakEvenMonths', () => {
  it('computes backlinks * 2 / cost * 12 (per spec)', () => {
    // 200*2/100*12 = 48
    expect(breakEvenMonths(200, 100)).toBeCloseTo(48, 5);
  });

  it('returns null for non-positive cost', () => {
    expect(breakEvenMonths(200, 0)).toBeNull();
  });
});

describe('isHighValue', () => {
  it('requires da > 25 AND backlinks > 150', () => {
    expect(isHighValue(26, 151)).toBe(true);
    expect(isHighValue(25, 1000)).toBe(false);
    expect(isHighValue(99, 150)).toBe(false);
  });
});
