import type { Context, MiddlewareHandler, Next } from 'hono';
import type { Env } from '../types/env';

/**
 * Origin-aware CORS middleware.
 *
 * - Reads the comma-separated allowlist from env.ALLOWED_ORIGINS.
 * - Reflects the matched origin only (never wildcard).
 * - Handles preflight OPTIONS requests.
 * - Returns 403 when an origin is present but not allowlisted.
 */
export function cors(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const origin = c.req.header('Origin');
    const allowed = (c.env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    const isAllowed = origin !== undefined && allowed.includes(origin);

    if (origin !== undefined && !isAllowed) {
      // A browser request from a disallowed origin.
      return c.json({ error: 'Origin not allowed' }, 403);
    }

    if (isAllowed) {
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Vary', 'Origin');
      c.header('Access-Control-Allow-Credentials', 'true');
    }

    if (c.req.method === 'OPTIONS') {
      if (isAllowed) {
        c.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
        c.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
        c.header('Access-Control-Max-Age', '86400');
      }
      return c.body(null, 204);
    }

    await next();
  };
}
