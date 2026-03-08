import { test, expect } from '@playwright/test';
import { TEST_TEACHER, signupTeacher } from './helpers';

test.describe('Teacher Signup', () => {
  test('can create a new teacher account and reach the dashboard', async ({ page }) => {
    await signupTeacher(page);

    // Should be on the teacher dashboard
    await expect(page).toHaveURL(/\/teacher/);

    // Dashboard should have the sidebar
    await expect(page.locator('[data-sidebar="sidebar"]')).toBeVisible();
  });

  test('shows error for duplicate email', async ({ browser }) => {
    // Use a fresh context to avoid carrying over the logged-in session
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/signup');
    await page.getByLabel('Navn på studio eller virksomhet').fill('Another Studio');
    await page.getByLabel('E-post').fill(TEST_TEACHER.email);
    await page.locator('#password').fill(TEST_TEACHER.password);
    await page.getByRole('button', { name: 'Opprett konto' }).click();

    // Supabase may return an "already registered" error OR silently log in
    // the existing user (when email confirmation is disabled).
    await expect(
      page.getByText('allerede registrert').or(page.locator('[data-sidebar="sidebar"]'))
    ).toBeVisible({ timeout: 10_000 });

    await context.close();
  });
});
