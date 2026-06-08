import { test, expect } from '@playwright/test';
import { TEST_AUTH_USER, mockMagicLinkRequest } from './helpers';

test.describe('Auth', () => {
  test('renders the magic-link auth surface', async ({ page }) => {
    await page.goto('/auth');

    await expect(page.getByRole('heading', { name: 'Logg inn' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fortsett med Google' })).toBeVisible();
    await expect(page.getByLabel('E-post')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fortsett', exact: true })).toBeVisible();
  });

  test('validates email before requesting a magic link', async ({ page }) => {
    await page.goto('/auth');

    await page.getByRole('button', { name: 'Fortsett', exact: true }).click();
    await expect(page.getByText('Skriv inn e-posten din')).toBeVisible();

    await page.getByLabel('E-post').fill('ikke-en-epost');
    await page.getByRole('button', { name: 'Fortsett', exact: true }).click();
    await expect(page.getByText('Sjekk at e-posten er riktig')).toBeVisible();
  });

  test('shows the code-entry step after a successful magic-link request', async ({ page }) => {
    await mockMagicLinkRequest(page);

    await page.goto('/auth');
    await page.getByLabel('E-post').fill(TEST_AUTH_USER.email);
    await page.getByRole('button', { name: 'Fortsett', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Sjekk e-posten din' })).toBeVisible();
    await expect(page.getByText('Klikk lenken eller skriv inn koden.')).toBeVisible();
    await expect(page.locator('[data-slot="input-otp-slot"]')).toHaveCount(6);
  });
});
