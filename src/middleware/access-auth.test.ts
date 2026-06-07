import { describe, it, expect } from 'vitest';
import {
  isAccessConfigured,
  accessIssuer,
  decodeJwt,
  validateClaims,
  type AccessClaims,
} from './access-auth';
import type { Env } from '../types/env';

function env(partial: Partial<Env>): Env {
  return { SEO_API_KEY: 'k', ...partial } as unknown as Env;
}

// Build an unsigned compact JWT (header.payload.sig) for decode/claim tests.
function b64url(obj: unknown): string {
  return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function makeToken(header: object, payload: object): string {
  return `${b64url(header)}.${b64url(payload)}.${b64url('sig')}`;
}

describe('isAccessConfigured', () => {
  it('is false unless both team domain and aud are set', () => {
    expect(isAccessConfigured(env({}))).toBe(false);
    expect(isAccessConfigured(env({ ACCESS_TEAM_DOMAIN: 'team' }))).toBe(false);
    expect(isAccessConfigured(env({ ACCESS_AUD: 'aud' }))).toBe(false);
    expect(isAccessConfigured(env({ ACCESS_TEAM_DOMAIN: 'team', ACCESS_AUD: 'aud' }))).toBe(true);
  });
});

describe('accessIssuer', () => {
  it('expands a bare team name to the cloudflareaccess.com issuer', () => {
    expect(accessIssuer('myteam')).toBe('https://myteam.cloudflareaccess.com');
  });
  it('accepts a full domain and strips scheme / trailing slash', () => {
    expect(accessIssuer('https://myteam.cloudflareaccess.com/')).toBe(
      'https://myteam.cloudflareaccess.com',
    );
  });
});

describe('decodeJwt', () => {
  it('decodes header + payload of a well-formed token', () => {
    const token = makeToken({ alg: 'RS256', kid: 'abc' }, { aud: 'x', iss: 'y', exp: 123 });
    const decoded = decodeJwt(token);
    expect(decoded?.header).toEqual({ alg: 'RS256', kid: 'abc' });
    expect(decoded?.payload).toMatchObject({ aud: 'x', iss: 'y', exp: 123 });
    expect(decoded?.signingInput.split('.')).toHaveLength(2);
  });

  it('returns null for malformed tokens', () => {
    expect(decodeJwt('not-a-jwt')).toBeNull();
    expect(decodeJwt('a.b')).toBeNull();
    expect(decodeJwt('@@.@@.@@')).toBeNull();
  });
});

describe('validateClaims', () => {
  const cfg = env({ ACCESS_TEAM_DOMAIN: 'myteam', ACCESS_AUD: 'app-aud-123' });
  const base: AccessClaims = {
    aud: 'app-aud-123',
    iss: 'https://myteam.cloudflareaccess.com',
    exp: 2_000,
  };
  const now = 1_000_000; // ms; exp(2000)*1000 = 2_000_000 > now -> valid

  it('accepts a valid token', () => {
    expect(validateClaims(base, cfg, now)).toEqual({ ok: true });
  });

  it('accepts aud given as an array containing the expected value', () => {
    expect(validateClaims({ ...base, aud: ['other', 'app-aud-123'] }, cfg, now)).toEqual({
      ok: true,
    });
  });

  it('rejects an aud mismatch', () => {
    expect(validateClaims({ ...base, aud: 'wrong' }, cfg, now)).toMatchObject({ ok: false });
  });

  it('rejects an issuer mismatch', () => {
    expect(validateClaims({ ...base, iss: 'https://evil.example' }, cfg, now)).toMatchObject({
      ok: false,
    });
  });

  it('rejects an expired token', () => {
    // exp 2000s -> 2_000_000ms; nowMs just past it
    expect(validateClaims(base, cfg, 2_000_001)).toMatchObject({ ok: false, reason: 'token expired' });
  });
});
