import { describe, it, expect } from 'vitest';
import { selectProvider } from '../seo-api';
import type { Env } from '../../types/env';

function envWith(seoProvider?: string): Env {
  // Only the fields selectProvider reads need to be real.
  return {
    SEO_API_KEY: 'test-key',
    SEO_PROVIDER: seoProvider,
  } as unknown as Env;
}

describe('selectProvider', () => {
  it('defaults to the mock provider when SEO_PROVIDER is unset', () => {
    expect(selectProvider(envWith(undefined)).name).toBe('mock');
  });

  it('returns the mock provider for SEO_PROVIDER="mock"', () => {
    expect(selectProvider(envWith('mock')).name).toBe('mock');
  });

  it('returns the ahrefs provider for SEO_PROVIDER="ahrefs" (case-insensitive)', () => {
    expect(selectProvider(envWith('AHREFS')).name).toBe('ahrefs');
  });

  it('falls back to mock for an unknown provider', () => {
    expect(selectProvider(envWith('semrush')).name).toBe('mock');
  });
});
