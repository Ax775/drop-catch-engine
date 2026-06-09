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

    // INSERT … RETURNING yields the generated id only when a row was actually
    // inserted; a duplicate is ignored and returns no row. This collapses the
    // former insert + follow-up SELECT into one statement and removes the
    // read-after-write race where a concurrent ingest could be observed.
    const row = await c.env.DB.prepare(
      `INSERT OR IGNORE INTO domains (domain_name, expiration_date, acquisition_cost_eur, status)
       VALUES (?, ?, ?, 'scanned')
       RETURNING id`,
    )
      .bind(domainName, d.expiration_date ?? null, d.acquisition_cost_eur ?? null)
      .first<{ id: string }>();

    if (!row) {
      duplicates++;
      continue;
    }
    accepted++;

    await c.env.DOMAIN_QUEUE.send({
      domainId: row.id,
      domainName,
    });
    queued++;
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
