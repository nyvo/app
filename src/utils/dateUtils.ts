import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

/**
 * Parse a date string (ISO YYYY-MM-DD or full ISO) into local year/month/day.
 * Avoids timezone bugs from `new Date('YYYY-MM-DD')` which parses as UTC.
 */
export function parseLocalDate(
  dateString: string
): { year: number; month: number; day: number } | null {
  const parts = dateString.slice(0, 10).split('-');
  if (parts.length < 3) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;
  return { year, month, day };
}

/**
 * Format a Date as YYYY-MM-DD using local timezone (not UTC).
 */
export function formatLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get the current time in Oslo timezone
 */
export function getOsloTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
}

/**
 * Get the Monday of the week containing the given date
 * @param date - Any date in the week
 * @returns The Monday of that week
 */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Day name abbreviations in Norwegian
 */
const DAY_NAMES_NO = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'] as const;

export interface WeekDay {
  name: string;
  date: number;
  fullDate: Date;
  isToday: boolean;
  isWeekend: boolean;
}

/**
 * Generate an array of days for a week starting from Monday
 * @param monday - The Monday of the week
 * @param today - Today's date (for isToday comparison)
 * @param dayNames - Array of day name abbreviations (defaults to Norwegian)
 * @returns Array of WeekDay objects
 */
export function generateWeekDays(
  monday: Date,
  today: Date,
  dayNames: readonly string[] = DAY_NAMES_NO
): WeekDay[] {
  return dayNames.map((name, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      name,
      date: date.getDate(),
      fullDate: new Date(date),
      isToday: date.toDateString() === today.toDateString(),
      isWeekend: index >= 5,
    };
  });
}

/**
 * Format a date using Norwegian locale
 * @param date - The date to format
 * @param formatString - date-fns format string (default: 'PPP' for full date)
 * @returns Formatted date string
 */
export function formatDateNorwegian(date: Date, formatString: string = 'PPP'): string {
  return format(date, formatString, { locale: nb });
}

