import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

export function formatKroner(amount: number | null | undefined): string {
  return `${(amount ?? 0).toLocaleString('nb-NO')} kr`;
}

/**
 * Course-aware price formatter. Renders `Gratis` for free courses (price 0,
 * null, or undefined) per the copy style guide; otherwise delegates to
 * `formatKroner`. Use this on any public price display so the "0 kr" anti-pattern
 * never reaches a user.
 */
export function formatCoursePrice(amount: number | null | undefined): string {
  return amount && amount > 0 ? formatKroner(amount) : 'Gratis';
}

/**
 * Conservatively title-cases a person's name on write, so the common
 * all-lowercase typo `ola nordmann` is stored as `Ola Nordmann`. Splits on
 * spaces and hyphens (both preserved) and capitalizes each part's first
 * letter — but ONLY when that part is entirely lowercase. Any part that
 * already contains an uppercase letter is left untouched, so deliberate
 * casing survives: `McLeod`, `O'Brien`, `DJ`. Also collapses internal
 * whitespace and trims, so it doubles as the name normalizer on save.
 *
 * Light-touch by design: the goal is to fix the lowercase typo, not to enforce
 * a canonical form. Known trade-off — a lowercase particle (`van`, `de`) the
 * user typed gets capitalized too (`van der berg` → `Van Der Berg`); these are
 * rare in Norwegian names and not worth a heuristic that risks real names.
 * Uses `nb-NO` casing so `å/ø/æ` uppercase correctly.
 */
export function formatPersonName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\s-]+/g, (part) =>
      part === part.toLocaleLowerCase('nb-NO')
        ? part.charAt(0).toLocaleUpperCase('nb-NO') + part.slice(1)
        : part,
    );
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

const PHONE_REGEX = /^\+?\d{8,15}$/;

/**
 * Lenient phone check for booking forms. Strips spaces, dashes, and
 * parentheses, then requires 8–15 digits with an optional leading `+`.
 * Norwegian numbers are 8 digits; the upper bound leaves room for the
 * occasional foreign student booking with a country code. Deliberately
 * permissive — the goal is to catch typos and junk, not to reject valid
 * international numbers.
 */
export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone.replace(/[\s\-()]/g, ''));
}

/**
 * Lowercase + diacritic-strip for Norwegian-name list filters.
 *
 * Required for every Studio search input over user-typed text (see
 * `studio-design § 20`): plain `.toLowerCase().includes(q)` fails on names
 * like `Mårten Sønnergård` when the user types `morten sonner`. NFD splits
 * accented characters into base + combining mark, then `\p{Diacritic}` strips
 * the marks — so `å → a`, `ø → o`, `æ → ae`-ish (æ has no decomposition, but
 * it still folds consistently against itself). Combine with
 * `toLocaleLowerCase('nb-NO')` so the casing rules respect Norwegian.
 */
export function foldNorwegian(value: string): string {
  return value
    .toLocaleLowerCase('nb-NO')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/**
 * Treats a name equal to the email local-part (`kristian@example.com` →
 * `kristian`) as a placeholder and returns empty. The signup trigger no longer
 * seeds this (see 20260608205606_profile_name_no_email_seed), but some OAuth
 * providers still hand back a name that matches the email prefix — this keeps
 * those out of inputs and display surfaces.
 */
export function resolveDisplayName(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const trimmed = name?.trim();
  if (!trimmed) return '';
  const emailPrefix = email?.split('@')[0];
  if (emailPrefix && trimmed.toLowerCase() === emailPrefix.toLowerCase()) return '';
  return trimmed;
}

/**
 * The name shown on an account card (sidebar, menus) across all three account
 * types. Precedence: a real personal name → the seller/studio name → email.
 *
 * Personal name runs through `resolveDisplayName` so an email-prefix placeholder
 * never out-prioritizes a legitimate studio name. Buyers have no seller, so they
 * fall straight through to their personal name or email. Returns '' when nothing
 * usable exists — callers add their own final fallback (e.g. "Konto").
 */
export function accountDisplayName({
  profileName,
  sellerName,
  email,
}: {
  profileName?: string | null;
  sellerName?: string | null;
  email?: string | null;
}): string {
  return (
    resolveDisplayName(profileName, email) ||
    sellerName?.trim() ||
    email?.trim() ||
    ''
  );
}
