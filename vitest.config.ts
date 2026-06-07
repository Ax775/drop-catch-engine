import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Worker tests only — the dashboard has its own vitest run.
    include: ['src/**/*.test.ts'],
    exclude: ['dashboard/**', 'node_modules/**'],
  },
});
