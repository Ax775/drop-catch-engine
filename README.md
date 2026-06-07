# Drop-Catch & SEO Backlink Arbitrage Engine

A production-ready platform for discovering, scoring, and arbitraging expiring
domains based on their SEO backlink authority.

- **Backend** — Cloudflare Worker (Hono v4) + D1 + KV + Queues, TypeScript strict.
- **Frontend** — React 18 + Vite 5 + Tailwind CSS 3 dashboard (Cloudflare Pages).

## Architecture

```
ingest (POST) ──▶ D1 (domains)  ──▶ DOMAIN_QUEUE ──▶ consumer
                                                        │
                              fetch SEO metrics (KV-cached, backoff retry)
                                                        │
                              score + estimate value ──▶ UPDATE domains + log
```

The dashboard polls `/api/domains` every 30s, renders a sortable/filterable
table, an ROI calculator, and a system-log view, and can deploy a domain as an
active asset (which exposes an SEO-optimized static blueprint page).

## Backend setup

```bash
npm install

# 1. Provision Cloudflare resources and paste the returned ids into wrangler.toml
wrangler d1 create drop-catch-db
wrangler kv namespace create SEO_CACHE
wrangler kv namespace create SEO_CACHE --preview
wrangler queues create domain-score-queue
wrangler queues create domain-score-dlq

# 2. Apply the schema
npm run db:migrate:local   # local D1
npm run db:migrate         # remote D1

# 3. Set the SEO API secret (mock client accepts any value)
wrangler secret put SEO_API_KEY

# 4. Run / deploy
npm run dev                # local dev (do not run in CI)
npm run deploy
```

## Dashboard setup

```bash
cd dashboard
npm install
npm run dev      # http://localhost:5173, proxies /api -> http://localhost:8787
npm run build    # production bundle in dashboard/dist
```

Set `VITE_API_BASE_URL` to override the API origin (defaults to
`http://localhost:8787`).

## API

| Method | Path                  | Description                                  |
| ------ | --------------------- | -------------------------------------------- |
| GET    | `/api/health`         | Health check                                 |
| POST   | `/api/ingest`         | Ingest up to 100 domains, enqueue for scoring |
| GET    | `/api/domains`        | List (filter/sort/paginate)                  |
| GET    | `/api/domains/:id`    | Single domain                                |
| PATCH  | `/api/domains/:id`    | Update status (`deployed` \| `archived`)     |
| GET    | `/api/logs`           | Paginated system logs                        |
| GET    | `/api/blueprint/:id`  | SEO-optimized static HTML asset page         |

All `/api/*` routes are rate-limited (sliding window, KV-backed) and CORS is
restricted to `ALLOWED_ORIGINS`.

### Example ingest

```bash
curl -X POST http://localhost:8787/api/ingest \
  -H 'Content-Type: application/json' \
  -d '{"domains":[{"domain_name":"example.nl","acquisition_cost_eur":120}]}'
```

## Notes

- The SEO API client (`src/services/seo-api.ts`) is a deterministic mock that
  simulates Ahrefs/Moz responses, latency, 429/503 failures, and exponential
  backoff. Swap `mockFetch` for a real `fetch()` in production.
- Scoring rules live in `src/services/scorer.ts`; the dashboard ROI calculator
  mirrors the same value model.
