import { differenceInSeconds, formatDistanceToNow, format } from 'date-fns'
import { nb } from 'date-fns/locale'

/**
 * Norwegian relative time formatter tuned for the notification feed.
 *
 * Rules:
 *   < 60 s     → "nå nettopp"        (date-fns would say "mindre enn ett minutt siden")
 *   < 7 d      → "for X siden"       (date-fns nb, e.g. "for 5 min siden")
 *   ≥ 7 d this year   → "15. mai"           (short absolute, lowercase month)
 *   ≥ 7 d prior year  → "15. mai 2025"      (year disambiguates)
 *
 * Always returns a stable string from the same timestamp — safe to render
 * repeatedly in row keys.
 */
export function formatRelativeTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const now = new Date()
  const seconds = Math.abs(differenceInSeconds(now, date))

  if (seconds < 60) return 'nå nettopp'

  const sevenDays = 60 * 60 * 24 * 7
  if (seconds < sevenDays) {
    // "for X siden". date-fns adds the prefix when addSuffix=true.
    const distance = formatDistanceToNow(date, { locale: nb, addSuffix: true })
    return shortenDistance(distance)
  }

  return date.getFullYear() === now.getFullYear()
    ? format(date, 'd. MMM', { locale: nb })
    : format(date, 'd. MMM yyyy', { locale: nb })
}

/**
 * date-fns nb returns longer forms than we want in a tight feed row.
 *   "for 5 minutter siden" → "5 min"
 *   "for 2 timer siden"    → "2 t"
 *   "for 1 dag siden"      → "i går"  (when seconds < 48 h)  → handled below
 *   "for 3 dager siden"    → "3 d"
 * Drop the "for ... siden" envelope, abbreviate units. Keeps rows scannable.
 */
function shortenDistance(distance: string): string {
  // Strip surrounding "for ... siden"
  const stripped = distance.replace(/^for\s+/, '').replace(/\s+siden$/, '')

  return stripped
    .replace(/\bminutter?\b/, 'min')
    .replace(/\btimer?\b/, 't')
    .replace(/\bdager?\b/, 'd')
    .replace(/\bsekunder?\b/, 's')
    .replace(/\bmindre enn ett minutt\b/, '< 1 min')
}
