import { describe, it, expect } from 'vitest';
import { parseDomainInput, toIngestPayload, MAX_DOMAINS } from './parseDomains';

describe('parseDomainInput', () => {
  it('parses a bare domain', () => {
    const [line] = parseDomainInput('example.com');
    expect(line).toMatchObject({
      domain_name: 'example.com',
      valid: true,
      acquisition_cost_eur: undefined,
      expiration_date: undefined,
    });
  });

  it('parses domain, cost, and expiration', () => {
    const [line] = parseDomainInput('crypto-insights.io, 430, 2026-12-31');
    expect(line).toMatchObject({
      domain_name: 'crypto-insights.io',
      acquisition_cost_eur: 430,
      expiration_date: '2026-12-31',
      valid: true,
    });
  });

  it('lowercases and trims domains', () => {
    const [line] = parseDomainInput('  Example.NL , 100 ');
    expect(line.domain_name).toBe('example.nl');
    expect(line.acquisition_cost_eur).toBe(100);
  });

  it('ignores blank lines', () => {
    expect(parseDomainInput('\n\n  \nexample.com\n\n')).toHaveLength(1);
  });

  it('flags invalid domains as not valid', () => {
    const lines = parseDomainInput('not a domain\nok.com\nhttp://nope.com');
    expect(lines.map((l) => l.valid)).toEqual([false, true, false]);
  });

  it('rejects negative or non-numeric costs (left undefined)', () => {
    expect(parseDomainInput('a.com, -5')[0].acquisition_cost_eur).toBeUndefined();
    expect(parseDomainInput('a.com, abc')[0].acquisition_cost_eur).toBeUndefined();
  });

  it('accepts a zero cost', () => {
    expect(parseDomainInput('a.com, 0')[0].acquisition_cost_eur).toBe(0);
  });

  it('requires a TLD (single label is invalid)', () => {
    expect(parseDomainInput('localhost')[0].valid).toBe(false);
  });
});

describe('toIngestPayload', () => {
  it('keeps only valid lines and omits undefined optional fields', () => {
    const lines = parseDomainInput('good.com\nbad domain\npaid.io, 200');
    const payload = toIngestPayload(lines);
    expect(payload).toEqual([
      { domain_name: 'good.com' },
      { domain_name: 'paid.io', acquisition_cost_eur: 200 },
    ]);
  });

  it('includes expiration when present', () => {
    const payload = toIngestPayload(parseDomainInput('x.com, 10, 2027-01-01'));
    expect(payload[0]).toEqual({
      domain_name: 'x.com',
      acquisition_cost_eur: 10,
      expiration_date: '2027-01-01',
    });
  });
});

describe('MAX_DOMAINS', () => {
  it('matches the worker batch limit of 100', () => {
    expect(MAX_DOMAINS).toBe(100);
  });
});
