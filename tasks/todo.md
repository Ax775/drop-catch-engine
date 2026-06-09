# Drop Catch Engine — Task Log

## Done

### Backend (Cloudflare Worker)
- [x] Hono app, D1 schema + migration, KV cache, Queue producer/consumer
- [x] SEO API mock client with exponential-backoff retry + KV caching
- [x] Scoring rules engine + EUR value estimator
- [x] Routes: ingest, domains (filter/sort/paginate), logs, blueprint, health
- [x] CORS (origin allowlist) + KV sliding-window rate limiter
- [x] Widened PATCH status enum to full lifecycle (enables Undo/restore)

### Dashboard (React + Vite + Tailwind)
- [x] Reusable UI kit: Button, Input, Textarea, Select, Badge, Card, Alert,
      Spinner, Skeleton, EmptyState, Modal, Tabs, ConfirmDialog, Toast
- [x] Feature screens refactored onto the kit (Header, DomainTable,
      ROICalculator, DeployModal, StatusBadge, App)
- [x] `@/*` path alias (Vite + tsconfig)

### Design
- [x] Iterated through 3 directions → settled on modern sleek dark
      (Linear/Vercel): neutral near-black, violet accent, soft hairlines

### Features
- [x] In-UI ingest form (IngestModal) — parse, validate, batch submit
- [x] Toast notifications (success/error/info/warning, a11y roles, actions)
- [x] Archive confirmation dialog
- [x] Undo action on archive (restores previous status)
- [x] Bulk actions: multi-select (per-row + select-all/indeterminate),
      selection bar, bulk deploy, bulk archive (with confirm), per-action toasts

### Testing
- [x] Vitest in both packages (scoped configs)
- [x] Worker: scorer unit tests (14) — isHighValue / scoreDomain / estimateValue
- [x] Dashboard: extracted pure libs (parseDomains, value) + tests (21)
- [x] 35 tests passing total

### Ops / docs
- [x] Local end-to-end run (wrangler dev + D1/KV/Queues), seeded domains
- [x] wrangler.toml annotated with provisioning commands per binding
- [x] UI kit README documents every component incl. ConfirmDialog + useToast

## Review

The system runs end-to-end locally: ingest (UI or API) → queue → mock SEO
scoring with retry → D1 → dashboard, with deploy/archive/undo actions surfaced
via toasts. Both `tsc && vite build` (frontend) and `wrangler deploy --dry-run`
(worker) are clean. Verified live in-browser across desktop + mobile.

### Deploy
- [x] Worker deployed to Cloudflare (drop-catch-engine.*.workers.dev) with real
      D1/KV/Queue bindings; dashboard `.env.local` points at it

## Task: Stripe Checkout — blueprint/domain unlock (€29)

Keys arrive later as secrets. Full flow built now.

- [ ] `src/routes/checkout.ts` — `POST /api/checkout` (create session) + `POST /api/webhook` (verify sig, handle `checkout.session.completed`)
- [ ] `src/types/env.ts` — STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, DASHBOARD_URL
- [ ] `src/index.ts` — mount routes; `/api/webhook` is a public prefix (Stripe has no Access cookie)
- [ ] `wrangler.toml` — DASHBOARD_URL var + document Stripe secrets
- [ ] `package.json` — `stripe: ^14.0.0`
- [ ] `dashboard/src/api/client.ts` — `createCheckoutSession(domainId)`
- [ ] `dashboard/src/components/DeployModal.tsx` — "Unlock Blueprint — €29" → redirect to Stripe
- [x] `dashboard/src/App.tsx` — return handler (`?session_id=&domain_id=`) → toast + refresh + clean URL
- [x] install / tsc (both clean) / deploy worker / build+deploy dashboard / commit+push (c79a5d4)

Verified live: health 200; /api/checkout → 400 (no domain_id), 404 (unknown), 503
(real domain, Stripe not yet configured); /api/webhook → 400 (missing signature).
Remaining (your part): `wrangler secret put STRIPE_SECRET_KEY` (+ PUBLISHABLE/WEBHOOK_SECRET),
create the Stripe webhook endpoint → /api/webhook for `checkout.session.completed`.

Decisions: webhook does idempotent `UPDATE domains SET status='deployed'` + log (no purchases table);
Stripe on Workers uses `createFetchHttpClient()` + `constructEventAsync(..., createSubtleCryptoProvider())`;
`apiVersion` omitted to dodge type-literal mismatch; return handling lives in App (modal navigated to Stripe).

## Task: Marketing landing page + Stripe payment email notifications

### Landing page (Task 1)
- [x] `landing/index.html` — standalone dark SEO-tool landing (navbar, hero,
      how-it-works, 3 example domain table rows w/ blurred locked report, why, pricing, footer)
- [x] Responsive, max-width 1100px, no external fonts/frameworks, full meta tags, 16.2KB (<50KB)

### Email notifications via Resend (Task 2)
- [x] `npm install resend` (^6.12.4)
- [x] `src/types/env.ts` — added `RESEND_API_KEY: string`
- [x] `src/routes/checkout.ts` — after D1 update in `checkout.session.completed`,
      fetch domain_name + send notification email; guarded on RESEND_API_KEY, non-fatal try/catch
- [x] `wrangler.toml` — documented RESEND_API_KEY secret
- [x] tsc clean + wrangler dry-run bundles Resend cleanly

### Deploy (Task 3)
- [x] Created Pages project + deployed: https://drop-catch-landing.pages.dev (HTTP 200)
- [x] Redeployed worker with email feature (version 839f1eb6)
- [x] Commit + push to origin/main

### Review
Landing page is a 16.2KB standalone HTML (no frameworks/external fonts/CDN), dark
SEO-tool aesthetic, live at https://drop-catch-landing.pages.dev. Email notification
fires on `checkout.session.completed` after the D1 status update — fetches the
domain_name, sends via Resend, fully non-fatal and skipped entirely when
RESEND_API_KEY is unset (so the webhook ack is never blocked). Remaining (your part):
`wrangler secret put RESEND_API_KEY` and verify the `dropcatch.xaven.nl` sender
domain in Resend before emails actually send.

## In progress / next
- [x] Swappable SEO provider behind the mock (mock | ahrefs adapter) + tests
- [x] Deployed the SEO-provider refactor to the live Worker (version e926bdfd)
- [x] Cloudflare Access auth: JWT-verifying middleware (off until configured) +
      dashboard credentials + tests + docs/ACCESS_SETUP.md guide
- [x] Playwright e2e (local stack: vite test-mode + wrangler dev) — 6 specs:
      nav/keyboard, ROI math, ingest validation, full ingest→table round-trip
- [ ] Turn Access on (your part: Zero Trust app/policy) → set ACCESS_* + deploy
- [ ] Deploy the dashboard to Cloudflare Pages (after Access is on)
