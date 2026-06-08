import { test, expect } from '@playwright/test';

test.describe('Course Creation', () => {
  test.skip('needs a seeded authenticated seller account before it can run reliably', async ({ page }) => {
    await page.goto('/courses?new=1');
    await expect(page.getByRole('heading', { name: /Opprett kurs/i })).toBeVisible();
  });
});
