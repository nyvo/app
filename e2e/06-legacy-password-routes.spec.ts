import { test, expect } from '@playwright/test';

test.describe('Legacy Password Routes', () => {
  test('does not expose a password reset route', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.getByRole('heading', { name: 'Vi finner ikke denne siden' })).toBeVisible();
  });
});
