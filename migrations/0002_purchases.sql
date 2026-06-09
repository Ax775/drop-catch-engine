-- Drop-Catch Engine: purchases — records a confirmed Stripe payment per domain.
-- A row here is the single source of truth that a blueprint has been paid for;
-- the domains.status flag alone is NOT proof of payment.
-- Run with: wrangler d1 execute drop-catch-db --file=migrations/0002_purchases.sql

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL UNIQUE,
  amount_eur REAL NOT NULL,
  purchased_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_purchases_domain ON purchases(domain_id);
CREATE INDEX IF NOT EXISTS idx_purchases_session ON purchases(stripe_session_id);
