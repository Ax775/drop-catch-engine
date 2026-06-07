# Lessons

Patterns captured after corrections during the Drop Catch Engine build.

## Dev environment / tooling

- **Tailwind config changes need a dev-server restart.** Editing
  `tailwind.config.ts` (palette, fonts, radii) does NOT hot-reload reliably —
  the running Vite/Tailwind keeps the old token set, so new utilities like
  `bg-accent` resolve to nothing (transparent). After any config change, restart
  the dev server, not just reload the page. (Hit this twice across redesigns.)

- **HMR breaks on hook-structure changes.** Removing/adding a `useState` or
  reordering hooks in a component makes React Fast Refresh throw
  ("error occurred in <Component>") until a full reload. Errors carrying a
  `?t=<timestamp>` module query are HMR artifacts, not real bugs — reload (or
  restart) before concluding anything is broken.

- **Background `wrangler dev` is cwd-sensitive.** Background shells can start in
  the home dir, not the project. `npx wrangler` then picks up a *global* v4 with
  no `wrangler.toml` in sight ("Missing entry-point"). Always `cd` into the
  project (uses the pinned local wrangler v3 that reads the config).

- **Local D1 is keyed by `database_id`.** When the id in `wrangler.toml` changes,
  the local SQLite store changes too — re-run the migration or you get
  "no such table". Local state persists under `.wrangler/state`.

- **"Different data in browser vs curl" was a local-vs-remote split, not a
  process bug.** The dashboard's `dashboard/.env.local` set
  `VITE_API_BASE_URL=https://…workers.dev` (a *deployed* worker), so the app
  fetched from production (5 domains) while my local `wrangler dev` + curl used
  the local D1 (23 domains) — both legitimately reachable, hence the confusion.
  Lesson: when browser data doesn't match a local API check, FIRST look at
  `.env*` / `VITE_API_BASE_URL` before blaming stale processes. (Stray
  `wrangler dev`/`workerd` on 8787 across session resumes is also worth a
  `lsof -iTCP:8787` check, but it wasn't the cause here.)

- **Vitest scans from cwd by default.** Running the worker's `npm test` from the
  repo root picked up the dashboard's `*.test.ts` too. Scope each package with a
  `vitest.config.ts` (`include: ['src/**/*.test.ts']`, exclude `dashboard/**`).

## Verification

- **Toast/auto-dismiss vs screenshot latency.** A 4.5s auto-dismissing toast can
  expire before a preview screenshot lands, because each MCP eval/screenshot
  round-trip costs seconds. Don't conclude "it doesn't render" from a late
  screenshot — confirm with logs, or temporarily raise the duration to capture a
  visual, then revert.

- **Modals/dialogs render a tick after the trigger click.** When driving the UI
  via eval, opening a dialog and querying its contents in the same synchronous
  call fails (element not yet mounted). Split into two steps.

## Design direction

- "Looks AI-generated" → the tells are slate-900 + emerald + gradient text +
  pulsing dots + everything `rounded-2xl`. "Old-fashioned" → brutalist (sharp
  corners, mono uppercase, hard borders). What landed as "modern & sleek" was
  the Linear/Vercel register: neutral near-black, one refined violet accent,
  soft hairlines, normal-case medium-weight type, gentle radii, subtle motion.
  When direction is subjective, ask with concrete options before rebuilding.

## API design

- Restricting a PATCH status enum to `deployed|archived` blocked an Undo that
  needs to restore `scanned|high_value`. Widened to the full lifecycle enum.
  Lesson: model "restore/undo" paths when designing mutation validation.
