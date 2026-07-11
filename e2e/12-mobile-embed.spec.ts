import { test, expect } from '@playwright/test';
import { SMOKE_SELLER_SLUG, getFirstCourseHref } from './helpers';

/**
 * D6 — mobile pamelding layout, and D4 — /embed/:slug renders in-page
 * (docs/smoke-test-checklist.md §D).
 *
 * D4 note: the NEGATIVE case ("the app must NOT be framable elsewhere, e.g.
 * /auth") is verified via response headers (`curl -I`, see vercel.json's
 * frame-ancestors rules) in the non-browser smoke harness, not here —
 * X-Frame-Options/CSP frame-ancestors aren't observable from in-page JS, and
 * the local dev server this suite runs against doesn't send them at all
 * (they're only set at the Vercel edge). This file only proves the positive
 * case: the embed route itself renders correctly when actually framed.
 */

const MOBILE_VIEWPORT = { width: 375, height: 667 }; // iPhone SE (2020/2022) — matches checklist's "mobile 375px"

test.describe('D6 mobile pamelding layout', () => {
  test.use({ viewport: MOBILE_VIEWPORT, isMobile: true, hasTouch: true });

  test('D6 pamelding has no horizontal overflow and a visible primary CTA at 375px', async ({ page }) => {
    // Prefer the explicit paid-course pamelding URL; fall back to discovering a
    // course link on the storefront (works only if cards render as anchors).
    let pameldingUrl = process.env.SMOKE_PAID_COURSE_URL;
    if (!pameldingUrl) {
      const href = await getFirstCourseHref(page, SMOKE_SELLER_SLUG);
      test.skip(!href, `No SMOKE_PAID_COURSE_URL and no visible course under /${SMOKE_SELLER_SLUG}.`);
      pameldingUrl = `${href}/pamelding`;
    }

    await page.goto(pameldingUrl);

    // Works for both the free ("Bekreft påmelding") and paid ("Betal …")
    // submit buttons — there is exactly one <form> submit action per state.
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible({ timeout: 10_000 });
    await expect(submitButton).toBeEnabled();

    const scrollWidth = await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0);
    expect(scrollWidth).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 1);
  });
});

test.describe('D4 embed renders in-page', () => {
  test('D4 /embed/:slug renders inside an iframe', async ({ page, baseURL }) => {
    await page.setContent(
      `<iframe id="embed-frame" src="${baseURL}/embed/${SMOKE_SELLER_SLUG}" style="width:900px;height:700px;border:0"></iframe>`,
    );

    const frame = page.frameLocator('#embed-frame');
    // EmbedCalendar's month heading (<h2>) renders regardless of whether the
    // studio has any courses, so it's a reliable "it actually rendered, not
    // blocked/blank" proof independent of live course data.
    await expect(frame.getByRole('heading', { level: 2 }).first()).toBeVisible({ timeout: 15_000 });
    await expect(frame.getByText('Fant ikke denne kalenderen.')).not.toBeVisible();
  });
});
