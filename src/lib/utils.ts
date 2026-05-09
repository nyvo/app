import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

const EMPTY_STATE_KEY = 'emptyState';

export function getShowEmptyState(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.has(EMPTY_STATE_KEY)) return true;
  return localStorage.getItem(EMPTY_STATE_KEY) === 'true';
}

export function toggleEmptyState(): void {
  const current = localStorage.getItem(EMPTY_STATE_KEY) === 'true';
  if (current) {
    localStorage.removeItem(EMPTY_STATE_KEY);
  } else {
    localStorage.setItem(EMPTY_STATE_KEY, 'true');
  }
  window.location.reload();
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
