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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
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
 * When Supabase auto-creates a profile from an email, it seeds `name` with the
 * local-part of the email (`kristian@example.com` → `kristian`). That's a
 * placeholder, not a real name. Treat it as empty so inputs default to blank
 * instead of pre-filling with a half-name the user didn't type.
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
