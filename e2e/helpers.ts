import type { Page } from '@playwright/test';

// Use a unique-per-run ID set by playwright.config.ts so all test files
// share the same test emails within a run, but each run gets fresh emails.
const timestamp = process.env.TEST_RUN_ID || String(Date.now());

export const TEST_AUTH_USER = {
  email: `teacher-${timestamp}@test.example.com`,
};

export async function mockMagicLinkRequest(page: Page) {
  await page.route('**/auth/v1/otp*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '{}',
    });
  });
}
