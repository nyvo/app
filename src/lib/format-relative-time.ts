import { format } from 'date-fns'
import { nb } from 'date-fns/locale'

/**
 * Norwegian relative time formatter tuned for the notification feed.
 *
 * Flat, prefix-free buckets (no date-fns "omtrent"/"for … siden" envelope):
 *   < 60 s            → "nå"
 *   < 60 min          → "5 min"
 *   < 24 t            → "3 t"
 *   yesterday         → "i går"          (calendar day before today)
 *   < 7 d             → "3 d"
 *   ≥ 7 d this year   → "15. mai"        (short absolute, lowercase month)
 *   ≥ 7 d prior year  → "15. mai 2025"   (year disambiguates)
 *
 * Always returns a stable string from the same timestamp — safe to render
 * repeatedly in row keys.
 */
export function formatRelativeTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000))

  if (seconds < 60) return 'nå'

  const minutes = Math.floor(seconds / 60)
  if (seconds < 60 * 60) return `${minutes} min`

  const hours = Math.floor(seconds / 60 / 60)
  if (seconds < 60 * 60 * 24) return `${hours} t`

  if (isYesterday(date, now)) return 'i går'

  const days = Math.floor(seconds / 60 / 60 / 24)
  if (seconds < 60 * 60 * 24 * 7) return `${days} d`

  return date.getFullYear() === now.getFullYear()
    ? format(date, 'd. MMM', { locale: nb })
    : format(date, 'd. MMM yyyy', { locale: nb })
}

/** True when `date` falls on the calendar day before `now` (local time). */
function isYesterday(date: Date, now: Date): boolean {
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  )
}
