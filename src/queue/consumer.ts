import type { Env, DomainQueueMessage } from '../types/env';
import { fetchSeoMetrics } from '../services/seo-api';
import { scoreDomain, estimateValue } from '../services/scorer';

/**
 * Queue consumer: scores each ingested domain by fetching SEO metrics,
 * persisting the result and logging the outcome.
 *
 * Each message is isolated in try/catch so a single failure cannot abort the
 * whole batch. When the SEO API is exhausted we deliberately do NOT ack the
 * message so Cloudflare Queues retries it (and eventually routes to the DLQ).
 */
export async function handleQueue(
  batch: MessageBatch<DomainQueueMessage>,
  env: Env,
): Promise<void> {
  for (const message of batch.messages) {
    const { domainId, domainName } = message.body;

    try {
      const metrics = await fetchSeoMetrics(env, domainName);
      const { status, score } = scoreDomain(metrics);
      const estimatedValue = estimateValue(metrics);

      await env.DB.prepare(
        `UPDATE domains
           SET da_score = ?,
               backlink_count = ?,
               source_authority_links = ?,
               status = ?,
               estimated_value_eur = ?,
               updated_at = datetime('now')
         WHERE id = ?`,
      )
        .bind(
          metrics.da_score,
          metrics.backlink_count,
          JSON.stringify(metrics.source_authority_links),
          status,
          estimatedValue,
          domainId,
        )
        .run();

      await env.DB.prepare(
        `INSERT INTO system_logs (event, status, payload) VALUES (?, ?, ?)`,
      )
        .bind(
          'domain_scored',
          'success',
          JSON.stringify({
            domainId,
            domainName,
            da_score: metrics.da_score,
            backlink_count: metrics.backlink_count,
            status,
            score,
            estimated_value_eur: estimatedValue,
          }),
        )
        .run();

      message.ack();
    } catch (err) {
      const exhausted = err instanceof Error && err.message === 'SEO_API_EXHAUSTED';

      // Best-effort error log; never let logging failures mask the original error.
      try {
        await env.DB.prepare(
          `INSERT INTO system_logs (event, status, payload) VALUES (?, ?, ?)`,
        )
          .bind(
            'domain_score_failed',
            exhausted ? 'error' : 'warning',
            JSON.stringify({
              domainId,
              domainName,
              error: err instanceof Error ? err.message : 'unknown',
              willRetry: exhausted,
            }),
          )
          .run();
      } catch {
        // swallow — logging is non-critical
      }

      if (exhausted) {
        // Do not ack -> queue will retry and ultimately dead-letter.
        message.retry();
      } else {
        // Non-retryable application error; ack to avoid poison-message loops.
        message.ack();
      }
    }
  }
}
