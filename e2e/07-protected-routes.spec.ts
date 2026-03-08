import { test, expect } from '@playwright/test';

test.describe('Protected Routes', () => {
  test('redirects unauthenticated users from teacher dashboard to login', async ({ page }) => {
    await page.goto('/teacher');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('redirects unauthenticated users from course creation to login', async ({ page }) => {
    await page.goto('/teacher/new-course');

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('redirects unauthenticated users from student dashboard to login', async ({ page }) => {
    await page.goto('/student/dashboard');

    await expect(page).toHaveURL(/\/student\/login/, { timeout: 10_000 });
  });
});
