// Formatting helpers for email content and notification bodies.
// Deno mirror of src/lib/utils.ts for the server side. nb-NO locale,
// sentence case, no marketing fluff.

/** Norwegian kroner formatter — matches src/lib/utils.formatKroner. */
export function formatKroner(amount: number | null | undefined): string {
  return `${(amount ?? 0).toLocaleString('nb-NO')} kr`
}

/**
 * Format a course's start datetime for an email body.
 * Example: "onsdag 28. mai kl. 18:00"
 *
 * `startDate` is an ISO date string (date-only or full timestamp).
 * `timeSchedule` is the course's display time (e.g., "18:00", "18:00-19:30").
 */
export function formatCourseStart(
  startDate: string | null | undefined,
  timeSchedule: string | null | undefined,
): string {
  if (!startDate) return timeSchedule ?? ''
  const date = new Date(startDate)
  if (Number.isNaN(date.getTime())) return timeSchedule ?? ''
  const dateStr = new Intl.DateTimeFormat('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
  return timeSchedule ? `${dateStr} kl. ${timeSchedule}` : dateStr
}

/**
 * Format a date for an email body (no weekday, no time).
 * Example: "18. mai 2026"
 */
export function formatNorwegianDate(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * Short human-readable booking reference derived from a UUID.
 * Example: signup uuid `a3c8...e7f9c2` → `E7F9C2`.
 * Used in confirmation emails so the buyer has something to quote.
 */
export function shortBookingId(uuid: string): string {
  return uuid.replace(/-/g, '').slice(-6).toUpperCase()
}
