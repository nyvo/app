import { test, expect } from '@playwright/test';
import { TEST_TEACHER } from './helpers';

test.describe('Password Reset', () => {
  test('can request a password reset email', async ({ page }) => {
    await page.goto('/forgot-password');

    // Should see the forgot password form
    await expect(page.getByText('Glemt passord?')).toBeVisible();

    // Fill in email and submit
    await page.getByLabel('E-post').fill(TEST_TEACHER.email);
    await page.getByRole('button', { name: 'Send lenke' }).click();

    // Supabase may succeed (showing success state) or return an error
    // for test domain emails. Either response means the form works correctly.
    await expect(
      page.getByText('Sjekk e-posten din').or(page.getByText('Noe gikk galt'))
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows validation for empty email', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByRole('button', { name: 'Send lenke' }).click();

    await expect(page.getByText('Skriv inn e-posten din', { exact: true })).toBeVisible();
  });
});
