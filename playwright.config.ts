import { defineConfig, devices } from '@playwright/test';

// Set a unique run ID so all test files share the same test emails.
// This env var is read by e2e/helpers.ts.
process.env.TEST_RUN_ID = process.env.TEST_RUN_ID || String(Date.now());

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests sequentially (signup before login, etc.)
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on',
    screenshot: 'on',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start Vite dev server automatically
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
