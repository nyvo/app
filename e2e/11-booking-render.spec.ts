import { test, expect } from '@playwright/test';

/**
 * A1 (UI portion only) — docs/smoke-test-checklist.md.
 *
 * Renders a real paid, published, payment-ready course's /pamelding page up
 * to the point the Stripe Payment Element mounts — RENDERS TO PAY STEP ONLY.
 * This spec never fills in card details or confirms the PaymentIntent:
 * Stripe's Payment Element renders in a cross-origin iframe, so driving it
 * from Playwright is flaky and out of scope here. Confirming the PI via the
 * Stripe API (pm_card_visa) and asserting the webhook lands a `confirmed`+
 * `paid` signup is the non-browser harness's job (scripts/smoke/).
 */

const paidCourseUrl = process.env.SMOKE_PAID_COURSE_URL;

test.describe('A1 paid booking renders to pay step', () => {
  test('A1 booking flow renders to the payment step (does not submit payment)', async ({ page }) => {
    test.skip(
      !paidCourseUrl,
      'SMOKE_PAID_COURSE_URL not set — needs a real published, payment-ready paid ' +
        "course's /pamelding path (e.g. /kristoffer-studio/some-course/pamelding), " +
        'only obtainable via DB access. Skipping rather than inventing one; set the ' +
        'env var to run this check.',
    );

    await page.goto(paidCourseUrl!);

    await page.getByLabel('Fullt navn').fill('Smoke Test Testesen');
    await page.getByLabel('E-post').fill(`smoke-a1-${Date.now()}@example.com`);
    await page.getByLabel('Telefon').fill('40000000');
    await page.getByLabel('Jeg godtar').check();

    // The deferred-intent Payment Element mounts on page load for a paid,
    // payment-ready course — no submit needed to reveal it (see
    // CheckoutPage.tsx's `formReady && !isFree` branch). Assert its
    // cross-origin iframe is present inside #payment rather than reaching
    // into Stripe's own markup.
    await expect(page.locator('#payment iframe').first()).toBeVisible({ timeout: 15_000 });

    // The pay button reflects the real total ("Betal 450 kr") — confirms the
    // form is fully interactive at the pay step, without clicking it.
    await expect(page.getByRole('button', { name: /^Betal /i })).toBeVisible();
  });
});
