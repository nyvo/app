/**
 * Capture the landing page's product screenshots from the staged dev routes.
 *
 *   node scripts/capture-landing-hero.mjs [--shot hero|storefront|all] [--url http://localhost:5177]
 *
 * Shots (see src/pages/dev/LandingShot*.tsx for the staged sources):
 *   hero       → /dev/landing-shot            → public/landing-dashboard.webp  (2400×1660)
 *   storefront → /dev/landing-shot-storefront → public/landing-storefront.webp (1600×1356)
 *   og         → /dev/og-card                 → public/og-brand-upnext.png            (1200×630)
 *
 * Re-run whenever the product UI changes so the landing page never shows a
 * stale product. Requires a running dev server. If output dimensions change,
 * update the <img width/height> attributes in src/pages/public/LandingPage.tsx.
 */
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : fallback;
};

const baseUrl = arg('--url', 'http://localhost:5177');
const which = arg('--shot', 'all');

/** Dev-only chrome out, natural nav state in — applied to the hero shot. */
const groomHero = () => {
  // 1. The sidebar's local-dev "Dev" nav entry never ships to prod; it must
  //    not ship in the screenshot either.
  document.querySelectorAll('a[href="/dev"]').forEach((a) => {
    a.closest('li')?.remove();
  });
  // 2. On the real dashboard "Oversikt" is the active nav item; the dev
  //    route's path can't trigger that, so set the data-active state the
  //    sidebar primitives style on.
  const oversikt = [...document.querySelectorAll('[data-sidebar="menu-button"]')].find(
    (el) => el.textContent?.trim() === 'Oversikt',
  );
  oversikt?.setAttribute('data-active', 'true');
};

const SHOTS = {
  hero: {
    path: '/dev/landing-shot',
    width: 1200,
    height: 830,
    out: 'public/landing-dashboard.webp',
    groom: groomHero,
  },
  storefront: {
    path: '/dev/landing-shot-storefront',
    width: 800,
    height: 678,
    out: 'public/landing-storefront.webp',
    groom: null,
  },
  // Social share card. OG scrapers want a plain PNG at exactly 1200×630;
  // captured at DPR 2 and downscaled for crisp type.
  og: {
    path: '/dev/og-card',
    width: 1200,
    height: 630,
    out: 'public/og-brand-upnext.png',
    groom: null,
    png: true,
  },
};

const names = which === 'all' ? Object.keys(SHOTS) : [which];
if (names.some((n) => !SHOTS[n])) {
  console.error(`Unknown --shot "${which}". Use: ${Object.keys(SHOTS).join(', ')}, all`);
  process.exit(1);
}

const browser = await chromium.launch();
for (const name of names) {
  const shot = SHOTS[name];
  const page = await browser.newPage({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 2,
  });
  await page.goto(`${baseUrl}${shot.path}`, { waitUntil: 'load' });
  // Staged routes render synchronously from mocks; wait for fonts and a
  // settle beat so the shot never catches a half-painted frame.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  if (shot.groom) {
    await page.evaluate(shot.groom);
    await page.waitForTimeout(100);
  }
  const png = await page.screenshot({ type: 'png' });
  await page.close();

  const out = shot.png
    ? await sharp(png).resize(shot.width, shot.height).png().toBuffer()
    : await sharp(png).webp({ quality: 88 }).toBuffer();
  const meta = await sharp(out).metadata();
  await sharp(out).toFile(shot.out);
  console.log(`wrote ${shot.out} (${meta.width}x${meta.height}, ${(out.length / 1024).toFixed(0)} KB)`);
}
await browser.close();
