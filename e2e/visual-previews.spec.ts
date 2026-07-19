import { test, expect } from '@playwright/test';

/**
 * Visual regression over the auth-free /dev/* preview routes.
 *
 * Purpose: catch unintended visual drift when components change — every UI
 * edit should run `npm run test:visual` and eyeball any diff before commit
 * (ux-ui-pro skill, "Before you commit"). After an INTENDED change, refresh
 * the baselines with `npm run test:visual -- --update-snapshots` and commit
 * the updated PNGs together with the code.
 *
 * The clock is frozen so date-derived rendering (relative day labels, chart
 * axes, month names in copy) doesn't churn the snapshots daily.
 *
 * Curated to the stable, load-bearing previews; add a route here when a new
 * /dev/* preview earns a baseline.
 */

const FIXED_TIME = new Date('2026-07-05T10:00:00');

const PREVIEWS = [
  // Foundations
  'tokens',
  'primitives',
  'states',
  'settings-rows-preview',
  // Seller — dashboard & daily
  'dashboard-preview',
  'income-chart-preview',
  'courses-list-preview',
  // Money
  'billing-preview',
  // Buyer / public
  'storefront',
  'detail-t1-preview',
  'checkout-t1-preview',
  // Onboarding
  'onboarding-preview',
  'get-started-preview',
];

for (const route of PREVIEWS) {
  test(`dev preview: ${route}`, async ({ page }) => {
    await page.clock.install({ time: FIXED_TIME });
    await page.goto(`/dev/${route}`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot(`${route}.png`, {
      fullPage: true,
      animations: 'disabled',
      // Tolerate sub-pixel anti-aliasing noise, nothing more.
      maxDiffPixelRatio: 0.01,
    });
  });
}
