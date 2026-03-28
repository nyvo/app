/**
 * Visual Audit Screenshot Script
 *
 * Takes screenshots of all teacher pages at mobile (375px) and desktop (1280px).
 * Requires a running dev server at localhost:5173 and valid teacher credentials.
 *
 * Usage:
 *   AUDIT_EMAIL=you@example.com AUDIT_PASSWORD=yourpass npx playwright test e2e/visual-audit.ts
 *
 * Or set defaults in .env.local and run:
 *   npx playwright test e2e/visual-audit.ts
 *
 * Screenshots saved to: /tmp/visual-audit/
 */

import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = '/tmp/visual-audit';
const EMAIL = process.env.AUDIT_EMAIL || '';
const PASSWORD = process.env.AUDIT_PASSWORD || '';

const TEACHER_PAGES = [
  { name: 'dashboard', path: '/teacher' },
  { name: 'courses', path: '/teacher/courses' },
  { name: 'schedule', path: '/teacher/schedule' },
  { name: 'signups', path: '/teacher/signups' },
  { name: 'messages', path: '/teacher/messages' },
  { name: 'profile', path: '/teacher/profile' },
];

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1280, height: 900 },
];

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('E-post').fill(EMAIL);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Logg inn' }).click();
  await page.waitForURL(/\/teacher/, { timeout: 15_000 });
  // Wait for initial data load
  await page.waitForTimeout(2000);
}

test('visual-audit: screenshot all teacher pages', async ({ browser }) => {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      'Set AUDIT_EMAIL and AUDIT_PASSWORD environment variables.\n' +
      'Example: AUDIT_EMAIL=you@example.com AUDIT_PASSWORD=pass npx playwright test e2e/visual-audit.ts'
    );
  }

  // Clean and create output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const viewport of VIEWPORTS) {
    // Create a new context per viewport with the right size
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();

    // Login once per viewport context
    await login(page);

    for (const teacherPage of TEACHER_PAGES) {
      await page.goto(teacherPage.path);
      // Wait for content to load and animations to settle
      await page.waitForTimeout(1500);

      // Full-page screenshot
      const filename = `${teacherPage.name}-${viewport.name}.png`;
      await page.screenshot({
        path: path.join(OUTPUT_DIR, filename),
        fullPage: true,
      });

      console.log(`✓ ${filename}`);
    }

    // Try to get the first course detail page
    await page.goto('/teacher/courses');
    await page.waitForTimeout(1500);

    // Click the first course link if it exists
    const firstCourse = page.locator('[role="link"]').first();
    if (await firstCourse.isVisible()) {
      await firstCourse.click();
      await page.waitForTimeout(1500);

      const detailFilename = `course-detail-${viewport.name}.png`;
      await page.screenshot({
        path: path.join(OUTPUT_DIR, detailFilename),
        fullPage: true,
      });
      console.log(`✓ ${detailFilename}`);
    }

    await context.close();
  }

  console.log(`\n📸 Screenshots saved to ${OUTPUT_DIR}`);
});
