import { test, expect } from '@playwright/test';
import { TEST_STUDENT, registerStudent } from './helpers';

test.describe('Student Registration', () => {
  test('can create a new student account and reach the dashboard', async ({ page }) => {
    await registerStudent(page);

    // Should be on the student dashboard
    await expect(page).toHaveURL(/\/student/);
  });

  test('duplicate email either shows error or logs in existing user', async ({ browser }) => {
    // Use a fresh context to avoid carrying over the logged-in session
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/student/register');
    await page.getByLabel('Navn').fill('Another Student');
    await page.getByLabel('E-post').fill(TEST_STUDENT.email);
    await page.locator('#password').fill(TEST_STUDENT.password);
    await page.getByRole('button', { name: 'Opprett konto' }).click();

    // Supabase may return an "already registered" error OR silently log in
    // the existing user (when email confirmation is disabled).
    // Either outcome is acceptable — we just verify the app doesn't crash.
    await expect(
      page.getByText('allerede registrert').or(page.locator('h1:has-text("Mine kurs")'))
    ).toBeVisible({ timeout: 10_000 });

    await context.close();
  });
});
