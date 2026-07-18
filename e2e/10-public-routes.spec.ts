import { test, expect } from '@playwright/test';
import { SMOKE_SELLER_SLUG, getFirstCourseHref } from './helpers';

/**
 * D1/D2/D3 — public surface smoke pass (docs/smoke-test-checklist.md §D).
 *
 * These hit the real remote Supabase DB behind the local dev server (same
 * test seller `scripts/smoke-public-storefront.mjs` targets), not mocks —
 * "renders without crash" here means the real data loads into the real page
 * without an error boundary, a stuck spinner, or a JS exception.
 */

test.describe('D1 public routes render', () => {
  test('D1 landing page renders', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const response = await page.request.get('/');
    const rawHomepage = await response.text();
    expect(rawHomepage).toContain('<title>Raden</title>');
    expect(rawHomepage).toContain('<meta name="application-name" content="Raden"');
    expect(rawHomepage).toContain('Raden er en norsk kursplattform');
    expect(rawHomepage).toContain('<a href="/personvern">Les personvernerklæringen</a>');

    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Raden', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Påmelding og betaling for kurs.', { exact: true })).toBeVisible();
    await expect(page.getByText(/hold oversikt over deltakerne på ett sted/i)).toBeVisible();
    await expect(page.getByText(/Google-innlogging er valgfri/i)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Les personvernerklæringen' })).toHaveAttribute(
      'href',
      '/personvern',
    );
    await expect(page.getByText('Noe gikk galt')).not.toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('D1 storefront renders', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`/${SMOKE_SELLER_SLUG}`);

    // StudioMasthead's <h1> is the seller name — its presence (rather than
    // the "public-team" not-found/server-error PageState) is the render proof.
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Vi finner ikke dette studioet')).not.toBeVisible();
    await expect(page.getByText('Noe gikk galt')).not.toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('D1 course detail renders', async ({ page }) => {
    const href = await getFirstCourseHref(page, SMOKE_SELLER_SLUG);
    test.skip(!href, `No visible published course under /${SMOKE_SELLER_SLUG} to open a detail page for.`);

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(href!);

    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Kurset er ikke lenger tilgjengelig')).not.toBeVisible();
    await expect(page.getByText('Noe gikk galt')).not.toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('D1 terms page renders', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: 'Vilkår', exact: true })).toBeVisible();
  });

  test('D1 privacy page renders', async ({ page }) => {
    await page.goto('/personvern');
    await expect(page.getByRole('heading', { name: 'Personvern', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Innlogging med Google' })).toBeVisible();
  });

  test('D1 about page renders', async ({ page }) => {
    await page.goto('/om-oss');
    await expect(page.getByRole('heading', { name: 'Om Raden' })).toBeVisible();
  });

  test('D1 garbage path renders a clean 404', async ({ page }) => {
    // Three segments where the last isn't "pamelding" matches no route in
    // App.tsx, so this always falls through to the router's `*` catch-all —
    // unlike a bad single-segment slug, which resolves inside
    // PublicCoursesPage's own not-found state instead (see D3 below).
    await page.goto('/this-route/does-not/exist-at-all');
    await expect(page.getByRole('heading', { name: 'Vi finner ikke denne siden' })).toBeVisible();
  });
});

test.describe('D2 draft course does not leak', () => {
  test('D2 draft course renders not-found, not the course', async ({ page }) => {
    const draftUrl = process.env.SMOKE_DRAFT_COURSE_URL;
    test.skip(
      !draftUrl,
      'SMOKE_DRAFT_COURSE_URL not set — needs a real draft course path (e.g. ' +
        '/seller-slug/draft-course-slug), only obtainable via DB access. Skipping ' +
        'rather than inventing one; set the env var to run this check.',
    );

    await page.goto(draftUrl!);

    // A draft is invisible to anon reads (RLS: courses_select_public requires
    // status <> 'draft'), so fetchPublicCourseBySlug resolves to null and the
    // detail page renders the same "public-course" not-found PageState a
    // deleted/cancelled course would — never the draft's real title/content.
    await expect(page.getByText('Kurset er ikke lenger tilgjengelig')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('D3 invalid slug renders a clean 404', () => {
  test('D3 unknown storefront slug resolves to not-found (no infinite spinner)', async ({ page }) => {
    await page.goto('/smoke-test-nonexistent-storefront-slug-000');

    await expect(page.getByText('Vi finner ikke dette studioet')).toBeVisible({ timeout: 10_000 });
  });

  test('D3 unknown course slug resolves to not-found (no infinite spinner)', async ({ page }) => {
    await page.goto(`/${SMOKE_SELLER_SLUG}/smoke-test-nonexistent-course-slug-000`);

    await expect(page.getByText('Kurset er ikke lenger tilgjengelig')).toBeVisible({ timeout: 10_000 });
  });
});
