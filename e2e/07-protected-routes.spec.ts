import { test, expect } from '@playwright/test';

test.describe('Protected Routes', () => {
  test('redirects unauthenticated users from overview to auth', async ({ page }) => {
    await page.goto('/overview');

    await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });
  });

  test('redirects unauthenticated users from seller courses to auth', async ({ page }) => {
    await page.goto('/courses');

    await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });
  });

  test('redirects unauthenticated users from profile settings to auth', async ({ page }) => {
    await page.goto('/settings/profile');

    await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });
  });
});
