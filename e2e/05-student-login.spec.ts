import { test, expect } from '@playwright/test';
import { TEST_STUDENT, loginStudent } from './helpers';

test.describe('Student Login', () => {
  test('can log in with valid credentials', async ({ page }) => {
    await loginStudent(page);

    // Should be on the student dashboard
    await expect(page).toHaveURL(/\/student/);
  });

  test('shows error for wrong password', async ({ page }) => {
    await page.goto('/student/login');
    await page.getByLabel('E-post').fill(TEST_STUDENT.email);
    await page.locator('#password').fill('wrongpassword123');
    await page.getByRole('button', { name: 'Logg inn' }).click();

    // Should show invalid credentials error
    await expect(page.getByText('stemmer ikke')).toBeVisible({ timeout: 10_000 });
  });
});
