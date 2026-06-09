import { Hono } from 'hono';
import type { Env } from '../types/env';
import {
  DomainFiltersSchema,
  UpdateStatusSchema,
  parseDomainRow,
  type DomainRowRaw,
} from '../types/domain';

export const domainsRoute = new Hono<{ Bindings: Env }>();

// Whitelist of sortable columns -> guards against SQL injection via sortBy.
const SORT_COLUMNS: Record<string, string> = {
  da_score: 'da_score',
  backlink_count: 'backlink_count',
  created_at: 'created_at',
  estimated_value_eur: 'estimated_value_eur',
};

/**
 * GET /api/domains — sortable, filterable, paginated list.
 */
domainsRoute.get('/', async (c) => {
  const parsed = DomainFiltersSchema.safeParse(c.req.query());
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
  if (f.minDa !== undefined) {
    where.push('da_score >= ?');
    params.push(f.minDa);
  }
  if (f.maxDa !== undefined) {
    where.push('da_score <= ?');
    params.push(f.maxDa);
  }
  if (f.search) {
    where.push('domain_name LIKE ?');
    params.push(`%${f.search}%`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const sortColumn = SORT_COLUMNS[f.sortBy] ?? 'created_at';
  const sortDir = f.sortDir === 'asc' ? 'ASC' : 'DESC';
  const offset = (f.page - 1) * f.limit;

  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM domains ${whereClause}`,
  )
    .bind(...params)
    .first<{ total: number }>();
  const total = countRow?.total ?? 0;

  const rows = await c.env.DB.prepare(
    `SELECT * FROM domains
     ${whereClause}
     ORDER BY ${sortColumn} ${sortDir}
     LIMIT ? OFFSET ?`,
  )
    .bind(...params, f.limit, offset)
    .all<DomainRowRaw>();

  const data = (rows.results ?? []).map(parseDomainRow);
  const totalPages = Math.max(1, Math.ceil(total / f.limit));

  return c.json({ data, total, page: f.page, limit: f.limit, totalPages });
});

/**
 * GET /api/domains/:id — single domain detail.
 */
domainsRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  const raw = await c.env.DB.prepare(`SELECT * FROM domains WHERE id = ?`)
    .bind(id)
    .first<DomainRowRaw>();

  if (!raw) {
    return c.json({ error: 'Domain not found' }, 404);
  }
  return c.json(parseDomainRow(raw));
});

/**
 * PATCH /api/domains/:id — update status to deployed or archived.
 */
domainsRoute.patch('/:id', async (c) => {
  const id = c.req.param('id');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const parsed = UpdateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 400);
  }

  const existing = await c.env.DB.prepare(`SELECT id FROM domains WHERE id = ?`)
    .bind(id)
    .first<{ id: string }>();
  if (!existing) {
    return c.json({ error: 'Domain not found' }, 404);
  }

  await c.env.DB.prepare(
    `UPDATE domains SET status = ?, updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(parsed.data.status, id)
    .run();

  await c.env.DB.prepare(
    `INSERT INTO system_logs (event, status, payload) VALUES (?, ?, ?)`,
  )
    .bind(
      'status_change',
      'info',
      JSON.stringify({ domainId: id, status: parsed.data.status }),
    )
    .run();

  const raw = await c.env.DB.prepare(`SELECT * FROM domains WHERE id = ?`)
    .bind(id)
    .first<DomainRowRaw>();

  if (!raw) {
    // The row existed a moment ago; a null here means it was deleted concurrently.
    return c.json({ error: 'Domain not found' }, 404);
  }
  return c.json(parseDomainRow(raw));
});
