import type { Page } from '@playwright/test';

// Use a unique-per-run ID set by playwright.config.ts so all test files
// share the same test emails within a run, but each run gets fresh emails.
const timestamp = process.env.TEST_RUN_ID || String(Date.now());

export const TEST_TEACHER = {
  studioName: 'Test Studio',
  email: `teacher-${timestamp}@test.example.com`,
  password: 'testpass123',
};

export async function signupTeacher(page: Page) {
  await page.goto('/signup');
  await page.getByLabel('Navn på studio eller virksomhet').fill(TEST_TEACHER.studioName);
  await page.getByLabel('E-post').fill(TEST_TEACHER.email);
  await page.locator('#password').fill(TEST_TEACHER.password);
  await page.getByRole('button', { name: 'Opprett konto' }).click();
  await page.waitForURL(/\/teacher/, { timeout: 15_000 });
}

export async function loginTeacher(page: Page) {
  await page.goto('/login');
  await page.getByLabel('E-post').fill(TEST_TEACHER.email);
  await page.locator('#password').fill(TEST_TEACHER.password);
  await page.getByRole('button', { name: 'Logg inn' }).click();
  await page.waitForURL(/\/teacher/, { timeout: 15_000 });
}
