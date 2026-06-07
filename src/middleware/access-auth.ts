import type { Context, MiddlewareHandler, Next } from 'hono';
import type { Env } from '../types/env';
import { cacheGet, cacheSet } from '../services/kv-cache';

/**
 * Cloudflare Access authentication.
 *
 * When ACCESS_TEAM_DOMAIN + ACCESS_AUD are configured, this middleware requires
 * a valid Access JWT (injected by Cloudflare as the `Cf-Access-Jwt-Assertion`
 * header, or carried in the `CF_Authorization` cookie). The token signature is
 * verified against the team's public JWKS and the aud/iss/exp claims are checked.
 *
 * When those env vars are unset the middleware is a no-op, so deploying this
 * code never locks anyone out until Access is intentionally turned on.
 */

const JWKS_CACHE_TTL_SECONDS = 60 * 60; // 1h
const JWKS_CACHE_KEY = 'access:jwks';

export interface AccessClaims {
  aud: string | string[];
  iss: string;
  exp: number;
  email?: string;
  sub?: string;
  [key: string]: unknown;
}

interface Jwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
}

/** Access is only enforced when both settings are present. */
export function isAccessConfigured(env: Env): boolean {
  return Boolean(env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD);
}

/** Normalize a team domain ("team" | "team.cloudflareaccess.com" | URL) to its issuer URL. */
export function accessIssuer(teamDomain: string): string {
  let host = teamDomain.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!host.includes('.')) host = `${host}.cloudflareaccess.com`;
  return `https://${host}`;
}

function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export interface DecodedJwt {
  header: { kid?: string; alg?: string };
  payload: AccessClaims;
  signingInput: string;
  signature: Uint8Array<ArrayBuffer>;
}

/** Split + decode a compact JWT without verifying the signature. Returns null if malformed. */
export function decodeJwt(token: string): DecodedJwt | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  try {
    const header = JSON.parse(bytesToString(base64UrlToBytes(h)));
    const payload = JSON.parse(bytesToString(base64UrlToBytes(p)));
    return { header, payload, signingInput: `${h}.${p}`, signature: base64UrlToBytes(s) };
  } catch {
    return null;
  }
}

/**
 * Validate the registered claims against Access config. Pure + unit-testable.
 * `nowMs` is injectable for deterministic tests.
 */
export function validateClaims(
  payload: AccessClaims,
  env: Env,
  nowMs: number,
): { ok: true } | { ok: false; reason: string } {
  const expectedAud = env.ACCESS_AUD ?? '';
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!auds.includes(expectedAud)) return { ok: false, reason: 'aud mismatch' };

  const expectedIss = accessIssuer(env.ACCESS_TEAM_DOMAIN ?? '');
  if (payload.iss !== expectedIss) return { ok: false, reason: 'iss mismatch' };

  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= nowMs) {
    return { ok: false, reason: 'token expired' };
  }
  return { ok: true };
}

/** Extract the Access token from the request (header preferred, cookie fallback). */
export function extractAccessToken(c: Context<{ Bindings: Env }>): string | null {
  const header = c.req.header('Cf-Access-Jwt-Assertion');
  if (header) return header.trim();

  const cookie = c.req.header('Cookie') ?? '';
  const match = cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function fetchJwks(env: Env): Promise<Jwk[]> {
  const cached = await cacheGet<{ keys: Jwk[] }>(env.SEO_CACHE, JWKS_CACHE_KEY);
  if (cached?.keys) return cached.keys;

  const url = `${accessIssuer(env.ACCESS_TEAM_DOMAIN ?? '')}/cdn-cgi/access/certs`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch Access JWKS: ${res.status}`);
  const body = (await res.json()) as { keys: Jwk[] };
  await cacheSet(env.SEO_CACHE, JWKS_CACHE_KEY, body, JWKS_CACHE_TTL_SECONDS);
  return body.keys;
}

async function verifySignature(decoded: DecodedJwt, jwks: Jwk[]): Promise<boolean> {
  const jwk = jwks.find((k) => k.kid === decoded.header.kid);
  if (!jwk) return false;
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  // Copy into fresh ArrayBuffer-backed views so the types satisfy BufferSource.
  const data = new Uint8Array(new TextEncoder().encode(decoded.signingInput));
  return crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    decoded.signature,
    data,
  );
}

/** Full verification: decode → check signature against JWKS → validate claims. */
export async function verifyAccessToken(token: string, env: Env): Promise<AccessClaims> {
  const decoded = decodeJwt(token);
  if (!decoded) throw new Error('Malformed token');
  if (decoded.header.alg !== 'RS256') throw new Error('Unsupported alg');

  const jwks = await fetchJwks(env);
  const signatureOk = await verifySignature(decoded, jwks);
  if (!signatureOk) throw new Error('Invalid signature');

  const claims = validateClaims(decoded.payload, env, Date.now());
  if (!claims.ok) throw new Error(claims.reason);

  return decoded.payload;
}

export interface AccessAuthOptions {
  /** Path prefixes that bypass Access (e.g. public health/blueprint endpoints). */
  publicPrefixes?: string[];
}

/**
 * Hono middleware enforcing Cloudflare Access on the routes it is mounted on.
 * No-op when Access is not configured, and always bypasses `publicPrefixes`.
 */
export function accessAuth(options: AccessAuthOptions = {}): MiddlewareHandler<{ Bindings: Env }> {
  const publicPrefixes = options.publicPrefixes ?? [];
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    if (!isAccessConfigured(c.env)) {
      await next();
      return;
    }

    const path = new URL(c.req.url).pathname;
    if (publicPrefixes.some((p) => path === p || path.startsWith(`${p}/`))) {
      await next();
      return;
    }

    const token = extractAccessToken(c);
    if (!token) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    try {
      await verifyAccessToken(token, c.env);
      await next();
    } catch (err) {
      return c.json(
        { error: 'Access denied', reason: err instanceof Error ? err.message : 'invalid token' },
        403,
      );
    }
  };
}
