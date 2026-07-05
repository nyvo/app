import { defineConfig, devices } from '@playwright/test';

// Set a unique run ID so all test files share the same test emails.
// This env var is read by e2e/helpers.ts.
process.env.TEST_RUN_ID = process.env.TEST_RUN_ID || String(Date.now());

// This repo runs in multiple Conductor worktrees on one machine; port 5173 is
// often held by ANOTHER worktree's dev server, and reuseExistingServer would
// silently test that code instead of this checkout. Set PW_PORT to force a
// fresh, port-exclusive server for this worktree (required for trustworthy
// visual snapshots): PW_PORT=5199 npm run test:visual
const PORT = process.env.PW_PORT || '5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests sequentially (signup before login, etc.)
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on',
    screenshot: 'on',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start Vite dev server automatically. With PW_PORT set, --strictPort makes
  // Vite fail instead of drifting to another port, and we never reuse a server
  // we didn't start (it could belong to a different worktree).
  webServer: {
    command: `npm run dev -- --port ${PORT}${process.env.PW_PORT ? ' --strictPort' : ''}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.PW_PORT,
    timeout: 30_000,
  },
});
