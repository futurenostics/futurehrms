import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for Phase 2 commission-run e2e tests.
 *
 * Assumes the dev API + web app are already running:
 *   - API:  http://localhost:4000
 *   - Web:  http://localhost:3000
 *
 * These tests hit the live dev DB. They're additive (create draft
 * runs, adjust them, approve/reject) but each test owns a unique
 * monthKey so reruns don't collide. Test data is cleaned up at
 * end-of-suite via the API.
 *
 * Run: `pnpm test:e2e` (after Playwright browsers are installed
 * via `pnpm exec playwright install chromium`).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: require.resolve('./tests/e2e/global-setup'),
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    storageState: './tests/.auth/admin-state.json',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
