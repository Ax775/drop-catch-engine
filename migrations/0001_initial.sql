-- Drop-Catch Engine: initial schema
-- Run with: wrangler d1 execute drop-catch-db --file=migrations/0001_initial.sql

CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  domain_name TEXT NOT NULL UNIQUE,
  expiration_date TEXT,
  da_score INTEGER NOT NULL DEFAULT 0,
  backlink_count INTEGER NOT NULL DEFAULT 0,
  source_authority_links TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'scanned' CHECK (status IN ('scanned','high_value','deployed','archived')),
  acquisition_cost_eur REAL,
  estimated_value_eur REAL,
  tld TEXT GENERATED ALWAYS AS (
    CASE WHEN instr(domain_name, '.') > 0
    THEN substr(domain_name, instr(domain_name, '.'))
    ELSE domain_name END
  ) VIRTUAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_domains_status ON domains(status);
CREATE INDEX IF NOT EXISTS idx_domains_da_score ON domains(da_score DESC);
CREATE INDEX IF NOT EXISTS idx_domains_created_at ON domains(created_at DESC);

CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('info','success','warning','error')),
  payload TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_status ON system_logs(status);
