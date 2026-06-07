import { Hono } from 'hono';
import type { Env } from '../types/env';
import { LogFiltersSchema } from '../types/domain';

export const logsRoute = new Hono<{ Bindings: Env }>();

interface SystemLogRow {
  id: string;
  event: string;
  status: string;
  payload: string | null;
  timestamp: string;
}

/**
 * GET /api/logs — paginated system logs, newest first.
 */
logsRoute.get('/', async (c) => {
  const parsed = LogFiltersSchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: 'Invalid query parameters', issues: parsed.error.issues }, 400);
  }
  const f = parsed.data;

  const where: string[] = [];
  const params: unknown[] = [];
  if (f.status) {
    where.push('status = ?');
    params.push(f.status);
  }
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (f.page - 1) * f.limit;

  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM system_logs ${whereClause}`,
  )
    .bind(...params)
    .first<{ total: number }>();
  const total = countRow?.total ?? 0;

  const rows = await c.env.DB.prepare(
    `SELECT * FROM system_logs
     ${whereClause}
     ORDER BY timestamp DESC
     LIMIT ? OFFSET ?`,
  )
    .bind(...params, f.limit, offset)
    .all<SystemLogRow>();

  const totalPages = Math.max(1, Math.ceil(total / f.limit));

  return c.json({
    data: rows.results ?? [],
    total,
    page: f.page,
    limit: f.limit,
    totalPages,
  });
});
