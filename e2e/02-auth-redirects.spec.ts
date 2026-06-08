import { test, expect } from '@playwright/test';

test.describe('Auth Redirects', () => {
  test('sends logged-out dashboard visitors to auth', async ({ page }) => {
    await page.goto('/overview');

    await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Logg inn' })).toBeVisible();
  });

  test('keeps direct auth visits on auth', async ({ page }) => {
    await page.goto('/auth');

    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole('heading', { name: 'Logg inn' })).toBeVisible();
  });
});
