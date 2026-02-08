import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

const EMPTY_STATE_KEY = 'emptyState';

/**
 * Check whether the dev "show empty state" flag is active.
 * Reads from URL query param (?emptyState) or localStorage.
 */
export function getShowEmptyState(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.has(EMPTY_STATE_KEY)) return true;
  return localStorage.getItem(EMPTY_STATE_KEY) === 'true';
}

/**
 * Toggle the dev empty-state flag in localStorage and reload the page.
 */
export function toggleEmptyState(): void {
  const current = localStorage.getItem(EMPTY_STATE_KEY) === 'true';
  if (current) {
    localStorage.removeItem(EMPTY_STATE_KEY);
  } else {
    localStorage.setItem(EMPTY_STATE_KEY, 'true');
  }
  window.location.reload();
}
