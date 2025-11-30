import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

/**
 * Get the current time in Oslo timezone
 */
export function getOsloTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
}

/**
 * Get the ISO week number for a given date
 * @param date - The date to get the week number for
 * @returns The ISO week number (1-53)
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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
export const DAY_NAMES_NO = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'] as const;

/**
 * Day name abbreviations in English
 */
export const DAY_NAMES_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

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

/**
 * Check if two dates are the same day
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if both dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.toDateString() === date2.toDateString();
}

/**
 * Add days to a date
 * @param date - The starting date
 * @param days - Number of days to add (can be negative)
 * @returns New date with days added
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add weeks to a date
 * @param date - The starting date
 * @param weeks - Number of weeks to add (can be negative)
 * @returns New date with weeks added
 */
export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}
