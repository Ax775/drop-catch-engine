export interface DomainQueueMessage {
  domainId: string;
  domainName: string;
  retryCount: number;
}

export interface Env {
  DB: D1Database;
  SEO_CACHE: KVNamespace;
  DOMAIN_QUEUE: Queue<DomainQueueMessage>;
  SEO_API_KEY: string;
  ALLOWED_ORIGINS: string;
  RATE_LIMIT_MAX: string;
  RATE_LIMIT_WINDOW_SECONDS: string;
  /** Which SEO provider to use: 'mock' (default) | 'ahrefs'. */
  SEO_PROVIDER?: string;
  /** Cloudflare Access team domain (e.g. "myteam" or "myteam.cloudflareaccess.com"). */
  ACCESS_TEAM_DOMAIN?: string;
  /** Cloudflare Access application AUD tag. Auth is enforced only when both are set. */
  ACCESS_AUD?: string;

  // --- Stripe (set via `wrangler secret put …`; payments are a no-op until present) ---
  /** Stripe secret API key (sk_…). Used to create Checkout Sessions. */
  STRIPE_SECRET_KEY: string;
  /** Stripe publishable key (pk_…). Reserved for client-side Stripe.js if needed. */
  STRIPE_PUBLISHABLE_KEY: string;
  /** Signing secret (whsec_…) for verifying webhook payloads. */
  STRIPE_WEBHOOK_SECRET: string;
  /** Public dashboard origin — base for Checkout success/cancel redirects. */
  DASHBOARD_URL: string;
}
