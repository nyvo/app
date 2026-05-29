/**
 * Course status: persisted workflow state vs. derived display lifecycle.
 *
 * Two different concepts that must NOT be conflated:
 *
 *  - `CourseStatus` (persisted, in @/types/database) is the workflow state the
 *    teacher controls: `draft` → `upcoming` (published) → `cancelled`. The
 *    enum also contains `active`/`completed`, but nothing in the app or backend
 *    ever writes them — a published course stays `upcoming` forever, even after
 *    its last session. Use the persisted value for permissions, publish /
 *    unpublish, cancellation and any backend write logic.
 *
 *  - `CourseDisplayStatus` (derived here) is the visual lifecycle, computed
 *    from the real timeline (sessions, falling back to course dates):
 *    `upcoming` before it starts, `active` while it runs, `completed` after the
 *    last session. This is for DISPLAY ONLY — badges, labels, at-a-glance state.
 *
 * `draft` and `cancelled` are authoritative workflow states and pass through
 * unchanged; only published courses get a derived lifecycle.
 */
import type { CourseStatus, CourseSession } from '@/types/database';

export type CourseDisplayStatus =
  | 'draft'
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'cancelled';

type SessionLike = Pick<CourseSession, 'session_date' | 'status'>;

export interface DeriveCourseDisplayStatusInput {
  /** Persisted workflow status from the DB. */
  status: CourseStatus;
  /** Course-level start date (YYYY-MM-DD). Fallback when sessions are absent. */
  startDate?: string | null;
  /** Course-level end date (YYYY-MM-DD). Fallback when sessions are absent. */
  endDate?: string | null;
  /**
   * Session rows. Preferred over the coarse date fields whenever present and
   * non-empty — sessions reflect reschedules and the true span of a series.
   * Pass `undefined`/empty when sessions are not loaded to use the date fallback.
   */
  sessions?: SessionLike[] | null;
}

/** Local calendar day as YYYY-MM-DD. Lexicographic compare is safe for this format. */
function todayKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Normalize a date-ish string to its YYYY-MM-DD prefix, or null if unusable. */
function dayKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}

/**
 * Derive the visual lifecycle status of a course from its timeline.
 *
 * @param now Injectable clock for testing; defaults to the current time.
 */
export function deriveCourseDisplayStatus(
  input: DeriveCourseDisplayStatusInput,
  now: Date = new Date(),
): CourseDisplayStatus {
  // Pre-publish and terminal workflow states are authoritative — never derived.
  if (input.status === 'draft') return 'draft';
  if (input.status === 'cancelled') return 'cancelled';

  // Published course: build the timeline. Prefer sessions (accurate for series
  // and reschedules); fall back to coarse course dates only when sessions are
  // not loaded. Cancelled sessions don't bound the active window.
  const sessionDays = (input.sessions ?? [])
    .filter((s) => s.status !== 'cancelled')
    .map((s) => dayKey(s.session_date))
    .filter((d): d is string => d !== null)
    .sort();

  let firstDay: string | null;
  let lastDay: string | null;
  if (sessionDays.length > 0) {
    firstDay = sessionDays[0];
    lastDay = sessionDays[sessionDays.length - 1];
  } else {
    firstDay = dayKey(input.startDate);
    // Single-session courses commonly have no end_date — start is the end.
    lastDay = dayKey(input.endDate) ?? firstDay;
  }

  // No usable timeline → can't derive. Honor a published lifecycle value if one
  // was somehow persisted, otherwise default to upcoming (the safe pre-start state).
  if (!firstDay) {
    return input.status === 'active' || input.status === 'completed'
      ? input.status
      : 'upcoming';
  }
  if (!lastDay || lastDay < firstDay) lastDay = firstDay;

  const today = todayKey(now);
  if (today < firstDay) return 'upcoming';
  if (today > lastDay) return 'completed';
  return 'active'; // inclusive of the first and last day
}
