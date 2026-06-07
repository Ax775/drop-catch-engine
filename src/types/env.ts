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
}
