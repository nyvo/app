import { test, expect } from '@playwright/test';
import { TEST_TEACHER, loginTeacher } from './helpers';

test.describe('Teacher Login', () => {
  test('can log in with valid credentials', async ({ page }) => {
    await loginTeacher(page);

    // Should be on the teacher dashboard
    await expect(page).toHaveURL(/\/teacher/);
  });

  test('shows error for wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-post').fill(TEST_TEACHER.email);
    await page.locator('#password').fill('wrongpassword123');
    await page.getByRole('button', { name: 'Logg inn' }).click();

    // Should show invalid credentials error
    await expect(page.getByText('stemmer ikke')).toBeVisible({ timeout: 10_000 });
  });

  test('shows validation for empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Logg inn' }).click();

    // Should show validation messages
    await expect(page.getByText('Skriv inn e-posten din')).toBeVisible();
  });
});
