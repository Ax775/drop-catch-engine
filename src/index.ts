import { Hono } from 'hono';
import type { Env, DomainQueueMessage } from './types/env';
import { cors } from './middleware/cors';
import { rateLimit } from './middleware/rate-limit';
import { accessAuth } from './middleware/access-auth';
import { ingestRoute } from './routes/ingest';
import { domainsRoute } from './routes/domains';
import { logsRoute } from './routes/logs';
import { blueprintRoute } from './routes/blueprint';
import { checkoutRoute, webhookRoute } from './routes/checkout';
import { handleQueue } from './queue/consumer';

const app = new Hono<{ Bindings: Env }>();

// CORS runs first so even error responses carry the right headers.
app.use('*', cors());

// Rate limiting applies only to the API surface.
app.use('/api/*', rateLimit());

// Cloudflare Access (no-op until configured). Enforced across the API surface
// EXCEPT the health check, the SEO blueprint pages (must stay public and
// crawlable), and the Stripe webhook (Stripe carries no Access cookie).
app.use(
  '/api/*',
  accessAuth({ publicPrefixes: ['/api/health', '/api/blueprint', '/api/webhook'] }),
);

app.get('/api/health', (c) =>
  c.json({ status: 'ok', ts: new Date().toISOString() }),
);

app.route('/api/ingest', ingestRoute);
app.route('/api/domains', domainsRoute);
app.route('/api/logs', logsRoute);
app.route('/api/blueprint', blueprintRoute);
app.route('/api/checkout', checkoutRoute);
app.route('/api/webhook', webhookRoute);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<DomainQueueMessage>, env: Env): Promise<void> {
    await handleQueue(batch, env);
  },
};
