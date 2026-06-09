import { Hono } from 'hono';
import { z } from 'zod';
import Stripe from 'stripe';
import { Resend } from 'resend';
import type { Env } from '../types/env';

/** POST /api/checkout request body. */
const CheckoutSchema = z.object({
  domain_id: z.string().min(1),
});

/**
 * Paid blueprint/domain unlock via Stripe Checkout.
 *
 *   POST /api/checkout  — authenticated dashboard user starts a one-time payment.
 *   POST /api/webhook   — Stripe calls back (no Access cookie → must be public).
 *
 * Both routers build the Stripe client lazily so the Worker still boots when the
 * keys are absent; the endpoints return 503 until the secrets are configured.
 */

/** €29,00 one-time, expressed in the smallest currency unit (cents). */
const UNIT_AMOUNT = 2900;
const CURRENCY = 'eur';

function stripeClient(env: Env): Stripe {
  // Workers have no Node http stack — use the fetch-based client. apiVersion is
  // intentionally omitted so we inherit the SDK's pinned version (and dodge the
  // strict apiVersion string-literal type).
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

async function log(env: Env, event: string, status: string, payload: unknown): Promise<void> {
  await env.DB.prepare(`INSERT INTO system_logs (event, status, payload) VALUES (?, ?, ?)`)
    .bind(event, status, JSON.stringify(payload))
    .run();
}

// ---------------------------------------------------------------------------
// POST /api/checkout
// ---------------------------------------------------------------------------
export const checkoutRoute = new Hono<{ Bindings: Env }>();

checkoutRoute.post('/', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'domain_id is required' }, 400);
  }
  const domainId = parsed.data.domain_id;

  const domain = await c.env.DB.prepare(`SELECT id, domain_name FROM domains WHERE id = ?`)
    .bind(domainId)
    .first<{ id: string; domain_name: string }>();
  if (!domain) {
    return c.json({ error: 'Domain not found' }, 404);
  }

  if (!c.env.STRIPE_SECRET_KEY) {
    return c.json({ error: 'Payments are not configured' }, 503);
  }

  // Strip any trailing slash so the query string concatenates cleanly.
  const dashboardUrl = (c.env.DASHBOARD_URL ?? '').replace(/\/+$/, '');

  try {
    const stripe = stripeClient(c.env);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: UNIT_AMOUNT,
            product_data: {
              name: `Domain Intelligence Report — ${domain.domain_name}`,
            },
          },
        },
      ],
      // {CHECKOUT_SESSION_ID} is a Stripe placeholder it substitutes on redirect.
      success_url: `${dashboardUrl}?session_id={CHECKOUT_SESSION_ID}&domain_id=${domain.id}`,
      cancel_url: dashboardUrl || undefined,
      metadata: { domain_id: domain.id },
    });

    await log(c.env, 'checkout_session_created', 'info', {
      domainId: domain.id,
      sessionId: session.id,
    });

    return c.json({ url: session.url });
  } catch (err) {
    await log(c.env, 'checkout_session_failed', 'error', {
      domainId: domain.id,
      message: err instanceof Error ? err.message : 'unknown',
    });
    return c.json({ error: 'Could not create checkout session' }, 502);
  }
});

// ---------------------------------------------------------------------------
// POST /api/webhook
// ---------------------------------------------------------------------------
export const webhookRoute = new Hono<{ Bindings: Env }>();

webhookRoute.post('/', async (c) => {
  const signature = c.req.header('stripe-signature');
  if (!signature) {
    return c.json({ error: 'Missing stripe-signature header' }, 400);
  }
  if (!c.env.STRIPE_SECRET_KEY || !c.env.STRIPE_WEBHOOK_SECRET) {
    return c.json({ error: 'Webhook not configured' }, 503);
  }

  // The raw body is required for signature verification — read it as text and
  // never parse it beforehand.
  const payload = await c.req.text();
  const stripe = stripeClient(c.env);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      c.env.STRIPE_WEBHOOK_SECRET,
      undefined,
      // SubtleCrypto-backed provider — Node's crypto isn't available on Workers.
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    return c.json(
      { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : 'unknown'}` },
      400,
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const domainId = session.metadata?.domain_id;

    if (domainId) {
      // Idempotent: re-delivering the same event just re-sets the same status.
      await c.env.DB.prepare(
        `UPDATE domains SET status = 'deployed', updated_at = datetime('now') WHERE id = ?`,
      )
        .bind(domainId)
        .run();

      // Record the payment. This row — keyed by the unique Stripe session id —
      // is the single source of truth that unlocks the full blueprint. INSERT OR
      // IGNORE keeps webhook re-deliveries idempotent (the UNIQUE constraint).
      await c.env.DB.prepare(
        `INSERT OR IGNORE INTO purchases (domain_id, stripe_session_id, amount_eur)
         VALUES (?, ?, ?)`,
      )
        .bind(domainId, session.id, session.amount_total ? session.amount_total / 100 : 29)
        .run();

      await log(c.env, 'checkout_completed', 'success', {
        domainId,
        sessionId: session.id,
        amountTotal: session.amount_total,
        currency: session.currency,
      });

      // Fire-and-forget payment notification. Never let an email failure (or a
      // missing RESEND_API_KEY) break the webhook ack — Stripe would retry.
      if (c.env.RESEND_API_KEY) {
        try {
          const row = await c.env.DB.prepare(`SELECT domain_name FROM domains WHERE id = ?`)
            .bind(domainId)
            .first<{ domain_name: string }>();
          const domainName = row?.domain_name ?? domainId;

          const resend = new Resend(c.env.RESEND_API_KEY);
          await resend.emails.send({
            from: c.env.RESEND_FROM,
            to: c.env.NOTIFY_EMAIL,
            subject: `💰 Domain blueprint unlocked — €29 received`,
            html: `
              <p><strong>New payment on Drop Catch Engine</strong></p>
              <p>Domain: ${domainName}<br>Amount: €29.00<br>Time: ${new Date().toISOString()}</p>
              <p><a href="https://drop-catch-dashboard.pages.dev">View dashboard →</a></p>
            `,
          });
        } catch (_) {
          /* non-fatal */
        }
      }
    } else {
      await log(c.env, 'checkout_completed', 'warning', {
        sessionId: session.id,
        note: 'missing metadata.domain_id',
      });
    }
  }

  return c.json({ received: true }, 200);
});
