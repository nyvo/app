import { test, expect } from '@playwright/test';
import { TEST_AUTH_USER, mockEmailAuthStatus, mockMagicLinkRequest } from './helpers';

// The /auth surface is email-first: step 1 identifies the email via the
// check_email_auth_status RPC, which routes to create-password (unknown),
// password sign-in (exists + password), or a login code (exists, no password).
test.describe('Auth', () => {
  test('renders the email-first auth surface', async ({ page }) => {
    await page.goto('/auth');

    await expect(
      page.getByRole('heading', { name: 'Logg inn eller opprett konto' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fortsett med Google' })).toBeVisible();
    await expect(page.getByLabel('E-post')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fortsett', exact: true })).toBeVisible();
  });

  test('validates email before identifying it', async ({ page }) => {
    await page.goto('/auth');

    await page.getByRole('button', { name: 'Fortsett', exact: true }).click();
    await expect(page.getByText('Skriv inn e-posten din')).toBeVisible();

    await page.getByLabel('E-post').fill('ikke-en-epost');
    await page.getByRole('button', { name: 'Fortsett', exact: true }).click();
    await expect(page.getByText('Sjekk at e-posten er riktig')).toBeVisible();
  });

  test('routes an unknown email to the create-password step', async ({ page }) => {
    await mockEmailAuthStatus(page, { email_exists: false, has_password: false });

    await page.goto('/auth');
    await page.getByLabel('E-post').fill(TEST_AUTH_USER.email);
    await page.getByRole('button', { name: 'Fortsett', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Lag et passord' })).toBeVisible();
    // The address is echoed so a typo is caught before a code never arrives.
    await expect(page.getByText(TEST_AUTH_USER.email)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Opprett konto' })).toBeVisible();

    // Signup enforces the password rules before any request is made.
    await page.getByLabel('Passord', { exact: true }).fill('kort');
    await page.getByRole('button', { name: 'Opprett konto' }).click();
    await expect(page.getByText('Passordet oppfyller ikke kravene under')).toBeVisible();
  });

  test('routes an existing password account to the sign-in step', async ({ page }) => {
    await mockEmailAuthStatus(page, { email_exists: true, has_password: true });

    await page.goto('/auth');
    await page.getByLabel('E-post').fill(TEST_AUTH_USER.email);
    await page.getByRole('button', { name: 'Fortsett', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Skriv inn passordet' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Logg inn', exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Glemt passordet? Logg inn med kode' }),
    ).toBeVisible();
  });

  test('routes a passwordless account to the login-code step', async ({ page }) => {
    await mockEmailAuthStatus(page, { email_exists: true, has_password: false });
    await mockMagicLinkRequest(page);

    await page.goto('/auth');
    await page.getByLabel('E-post').fill(TEST_AUTH_USER.email);
    await page.getByRole('button', { name: 'Fortsett', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Logg inn med kode' })).toBeVisible();
    await expect(page.getByText(`Vi sendte en kode til ${TEST_AUTH_USER.email}.`)).toBeVisible();
    await expect(page.locator('[data-slot="input-otp-slot"]')).toHaveCount(6);
  });
});
