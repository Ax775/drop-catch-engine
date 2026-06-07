# Securing the app with Cloudflare Access

The Worker already verifies Cloudflare Access JWTs (see
`src/middleware/access-auth.ts`). It stays **disabled** until you set two env
values, so nothing is locked out until you finish the steps below.

What's protected when enabled: `/api/ingest`, `/api/domains`, `/api/logs`.
What stays public: `/api/health` and `/api/blueprint/*` (SEO pages must stay
crawlable).

## 1. Create an Access application (Zero Trust dashboard)

1. Go to **Cloudflare dashboard → Zero Trust → Access → Applications → Add an
   application → Self-hosted**.
2. Application domain: your Worker host —
   `drop-catch-engine.alexander-kahwagi.workers.dev`.
   Add a second domain for the dashboard once it's on Pages
   (`drop-catch-dashboard.pages.dev`) so one login covers both.
3. Finish creating the app, then open it and copy the **Application Audience
   (AUD) tag** (a long hex string).
4. Note your **team domain**: `Zero Trust → Settings → Custom Pages` (or the URL
   `https://<team>.cloudflareaccess.com`). You need just `<team>`.

## 2. Add an Access policy

On the application, add a policy, e.g.:
- Name: "Allow team", Action: **Allow**
- Include: **Emails** = your address(es), or **Emails ending in** your domain,
  or a Google/GitHub identity provider.

## 3. Point the Worker at Access

Set the two values and redeploy. `ACCESS_TEAM_DOMAIN` accepts either the bare
team name or the full `*.cloudflareaccess.com` host.

```bash
# from the project root
npx wrangler secret put ACCESS_AUD          # paste the AUD tag
npx wrangler secret put ACCESS_TEAM_DOMAIN  # e.g. "alexander-kahwagi"
npx wrangler deploy
```

(They can also be `[vars]` in `wrangler.toml` instead of secrets — secrets are
recommended so the AUD isn't committed.)

Verify: `curl https://…workers.dev/api/domains` should now return **401**
(no token), while `/api/health` still returns `ok`.

## 4. Dashboard build (when deploying to Pages)

Set the API base at build time in the Pages project settings (Environment
variables), not via local `.env.local`:

```
VITE_API_BASE_URL = https://drop-catch-engine.alexander-kahwagi.workers.dev
```

## Cross-origin note (important)

The dashboard (`*.pages.dev`) and the API (`*.workers.dev`) are different
origins, so the Access session cookie must travel cross-origin. The client
already sends `credentials: 'include'`, and the Worker's CORS reflects the
origin with `Access-Control-Allow-Credentials: true`. This works, but the
**cleanest** setup is to serve both under one custom domain (e.g.
`app.example.com` for the dashboard and `app.example.com/api/*` routed to the
Worker), making the Access cookie first-party and removing the cross-origin
dance entirely. Recommended before going fully public.

## Turning it back off

Unset the vars (`wrangler secret delete ACCESS_AUD ACCESS_TEAM_DOMAIN`) and
redeploy — the middleware becomes a no-op again.
