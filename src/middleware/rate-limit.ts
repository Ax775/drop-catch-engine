import type { Context, MiddlewareHandler, Next } from 'hono';
import type { Env } from '../types/env';
import { cacheGet, cacheSet } from '../services/kv-cache';

/**
 * KV-based sliding-window rate limiter.
 *
 * Each client IP gets a KV key `rl:{ip}` whose value is a JSON array of ISO
 * timestamps. On every request we drop timestamps older than the window,
 * reject if the remaining count is at the limit, otherwise record the new
 * request. RateLimit headers are emitted on every response.
 */
export function rateLimit(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const ip =
      c.req.header('CF-Connecting-IP') ||
      c.req.header('X-Forwarded-For') ||
      'unknown';

    const max = Number.parseInt(c.env.RATE_LIMIT_MAX ?? '100', 10) || 100;
    const windowSeconds =
      Number.parseInt(c.env.RATE_LIMIT_WINDOW_SECONDS ?? '60', 10) || 60;
    const windowMs = windowSeconds * 1000;

    const key = `rl:${ip}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    const stored = (await cacheGet<string[]>(c.env.SEO_CACHE, key)) ?? [];
    const recent = stored.filter((ts) => {
      const t = Date.parse(ts);
      return Number.isFinite(t) && t > windowStart;
    });

    const resetEpochSeconds = Math.ceil((now + windowMs) / 1000);

    if (recent.length >= max) {
      // Earliest request in the window determines when a slot frees up.
      const earliest = recent
        .map((ts) => Date.parse(ts))
        .filter((t) => Number.isFinite(t))
        .sort((a, b) => a - b)[0];
      const retryAfter = earliest
        ? Math.max(1, Math.ceil((earliest + windowMs - now) / 1000))
        : windowSeconds;

      c.header('X-RateLimit-Limit', String(max));
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', String(Math.ceil((earliest + windowMs) / 1000)));
      c.header('Retry-After', String(retryAfter));
      return c.json({ error: 'Rate limit exceeded', retryAfter }, 429);
    }

    recent.push(new Date(now).toISOString());
    // Persist with a TTL slightly longer than the window so stale keys expire.
    await cacheSet(c.env.SEO_CACHE, key, recent, windowSeconds + 5);

    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(Math.max(0, max - recent.length)));
    c.header('X-RateLimit-Reset', String(resetEpochSeconds));

    await next();
  };
}
