/**
 * Course lifecycle derivation for edge functions.
 *
 * Deno-side mirror of `src/lib/course-status.ts` (kept in sync manually, same
 * convention as `_shared/pricing.ts`). Persisted `status` (draft / upcoming /
 * cancelled) is the workflow source of truth; this derives the visual lifecycle
 * from the timeline. Backend use is limited to the booking safety gate below —
 * `isCourseEnded` — NOT for permissions or write routing.
 */

export type CourseDisplayStatus =
  | 'draft'
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'cancelled'

interface SessionLike {
  session_date: string
  status?: string | null
}

export interface CourseTimelineInput {
  /** Persisted workflow status. */
  status: string
  /** Course-level start date (YYYY-MM-DD). Fallback when sessions are absent. */
  startDate?: string | null
  /** Course-level end date (YYYY-MM-DD). Fallback when sessions are absent. */
  endDate?: string | null
  /** Session rows. Preferred over the coarse date fields when present. */
  sessions?: SessionLike[] | null
}

/** Local calendar day as YYYY-MM-DD. Lexicographic compare is safe for this format. */
function todayKey(now: Date): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Normalize a date-ish string to its YYYY-MM-DD prefix, or null if unusable. */
function dayKey(value: string | null | undefined): string | null {
  if (!value) return null
  const key = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null
}

/** Derive the visual lifecycle of a course from its timeline. */
export function deriveCourseDisplayStatus(
  input: CourseTimelineInput,
  now: Date = new Date(),
): CourseDisplayStatus {
  if (input.status === 'draft') return 'draft'
  if (input.status === 'cancelled') return 'cancelled'

  const sessionDays = (input.sessions ?? [])
    .filter((s) => s.status !== 'cancelled')
    .map((s) => dayKey(s.session_date))
    .filter((d): d is string => d !== null)
    .sort()

  let firstDay: string | null
  let lastDay: string | null
  if (sessionDays.length > 0) {
    firstDay = sessionDays[0]
    lastDay = sessionDays[sessionDays.length - 1]
  } else {
    firstDay = dayKey(input.startDate)
    lastDay = dayKey(input.endDate) ?? firstDay
  }

  // No usable timeline → can't derive; treat as not-ended (fail open).
  if (!firstDay) {
    return input.status === 'active' || input.status === 'completed'
      ? (input.status as CourseDisplayStatus)
      : 'upcoming'
  }
  if (!lastDay || lastDay < firstDay) lastDay = firstDay

  const today = todayKey(now)
  if (today < firstDay) return 'upcoming'
  if (today > lastDay) return 'completed'
  return 'active'
}

/**
 * Booking safety gate: true only when a published course's last day is strictly
 * before today. Fails open (returns false) when the timeline can't be
 * determined, so an under-specified course is never wrongly blocked.
 */
export function isCourseEnded(input: CourseTimelineInput, now: Date = new Date()): boolean {
  return deriveCourseDisplayStatus(input, now) === 'completed'
}
