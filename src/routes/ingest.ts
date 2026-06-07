import { Hono } from 'hono';
import type { Env } from '../types/env';
import { IngestPayloadSchema } from '../types/domain';

export const ingestRoute = new Hono<{ Bindings: Env }>();

/**
 * POST /api/ingest
 * Accepts up to 100 domains, inserts them (ignoring duplicates) and enqueues
 * each newly inserted domain for SEO scoring.
 */
ingestRoute.post('/', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const parsed = IngestPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 400);
  }

  const { domains } = parsed.data;
  let accepted = 0;
  let queued = 0;
  let duplicates = 0;

  for (const d of domains) {
    const domainName = d.domain_name.trim().toLowerCase();

    const result = await c.env.DB.prepare(
      `INSERT OR IGNORE INTO domains (domain_name, expiration_date, acquisition_cost_eur, status)
       VALUES (?, ?, ?, 'scanned')`,
    )
      .bind(domainName, d.expiration_date ?? null, d.acquisition_cost_eur ?? null)
      .run();

    const inserted = (result.meta?.changes ?? 0) > 0;
    if (!inserted) {
      duplicates++;
      continue;
    }
    accepted++;

    // Fetch the generated id so the queue message references the right row.
    const row = await c.env.DB.prepare(`SELECT id FROM domains WHERE domain_name = ?`)
      .bind(domainName)
      .first<{ id: string }>();

    if (row) {
      await c.env.DOMAIN_QUEUE.send({
        domainId: row.id,
        domainName,
        retryCount: 0,
      });
      queued++;
    }
  }

  await c.env.DB.prepare(
    `INSERT INTO system_logs (event, status, payload) VALUES (?, ?, ?)`,
  )
    .bind(
      'ingest',
      'success',
      JSON.stringify({ submitted: domains.length, accepted, queued, duplicates }),
    )
    .run();

  return c.json({ accepted, queued, duplicates }, 201);
});
