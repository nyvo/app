import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': ['text-xxs'],
    },
  },
})

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
  if (amount == null || amount === 0) return 'Gratis';
  return `${amount.toLocaleString('nb-NO')} kr`;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}
