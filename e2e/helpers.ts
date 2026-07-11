import type { Page } from '@playwright/test';

// Use a unique-per-run ID set by playwright.config.ts so all test files
// share the same test emails within a run, but each run gets fresh emails.
const timestamp = process.env.TEST_RUN_ID || String(Date.now());

export const TEST_AUTH_USER = {
  email: `teacher-${timestamp}@test.example.com`,
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Mock the OTP send so the code-bridge branch works without a real email.
export async function mockMagicLinkRequest(page: Page) {
  await page.route('**/auth/v1/otp*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: CORS_HEADERS,
      body: '{}',
    });
  });
}

// Mock the check_email_auth_status RPC that step 1 of /auth uses to route:
// unknown → create password, exists+password → sign in, exists w/o password
// → login code.
export async function mockEmailAuthStatus(
  page: Page,
  status: { email_exists: boolean; has_password: boolean },
) {
  await page.route('**/rest/v1/rpc/check_email_auth_status*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: CORS_HEADERS,
      body: JSON.stringify([status]),
    });
  });
}

// ---------------------------------------------------------------------------
// Public-surface smoke helpers (docs/smoke-test-checklist.md, section D).
// Unlike the auth specs above, these hit the real remote Supabase DB behind
// the local dev server — the same test seller scripts/smoke-public-
// storefront.mjs targets — so there is nothing to mock: the tests read
// whatever is actually published for that seller right now.

/** Real test-seller storefront slug — same default scripts/smoke-public-storefront.mjs uses. */
export const SMOKE_SELLER_SLUG = process.env.SMOKE_SELLER_SLUG || 'kristoffer-studio';

/**
 * Opens the storefront for `sellerSlug` and returns the `href` of its first
 * course link (e.g. `/kristoffer-studio/yoga-basics`), or `null` if the
 * studio currently has no visible published courses. Lets specs discover a
 * real course at test time instead of hardcoding a slug that could go stale.
 */
export async function getFirstCourseHref(page: Page, sellerSlug: string): Promise<string | null> {
  await page.goto(`/${sellerSlug}`);
  const link = page.locator(`a[href^="/${sellerSlug}/"]`).first();
  if ((await link.count()) === 0) return null;
  return link.getAttribute('href');
}
