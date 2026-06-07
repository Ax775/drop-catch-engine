import { defineConfig } from '@playwright/test';

/**
 * E2E against a LOCAL stack:
 *  - vite in `test` mode (uses .env.test.local → API base http://localhost:8787)
 *  - the Worker via `wrangler dev` with local D1/KV/Queues
 *
 * Playwright starts and tears down both servers, so no stray processes linger.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5175',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --mode test --port 5175 --strictPort',
      url: 'http://localhost:5175',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npx wrangler dev src/index.ts --port 8787 --ip 127.0.0.1',
      cwd: '..',
      url: 'http://127.0.0.1:8787/api/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
