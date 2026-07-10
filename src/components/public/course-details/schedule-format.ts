import { toLocalDate, osloNowKey, osloTodayKey } from '@/utils/dateUtils';
import { singleDayCount, type PublicCourseWithDetails } from '@/services/publicCourses';
import type { AvailableTicketType, CourseSession } from '@/types/database';

/**
 * Shared date/time formatting for the course-detail fact band, the T1
 * "Timeplan" date-card strip, the schedule dialog, and the checkout page's
 * Billett constraint line. Consolidated here (rather than duplicated per
 * page, as before the CTA-first rework) so the detail page, its dev preview,
 * and checkout can never render three slightly different date grammars.
 */

export const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'] as const;
export const WEEKDAYS_PLURAL = ['søndager', 'mandager', 'tirsdager', 'onsdager', 'torsdager', 'fredager', 'lørdager'] as const;
export const SHORT_WEEKDAYS = ['søn.', 'man.', 'tir.', 'ons.', 'tor.', 'fre.', 'lør.'] as const;
export const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'] as const;
export const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

/** Capitalizes only the first character — safe for "tir. 12. aug" (unlike
 * CSS `capitalize`, which would also capitalize "aug"). */
export function capitalize(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function extractTime(timeSchedule: string | null): string {
  if (!timeSchedule) return '';
  const m = timeSchedule.match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : '';
}

/** Time range for the meta strip / fact band. Prefers a real "HH:MM-HH:MM"
 * in time_schedule; otherwise derives the end time from start + duration
 * minutes so the range always shows the full window. */
export function resolveTimeRange(timeSchedule: string | null, durationMinutes: number | null): string {
  if (!timeSchedule) return '';
  const rangeMatch = timeSchedule.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  if (rangeMatch) return `${rangeMatch[1]}–${rangeMatch[2]}`;
  const start = extractTime(timeSchedule);
  if (!start || !durationMinutes || durationMinutes <= 0) return start;
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + durationMinutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${start}–${pad(endH)}:${pad(endM)}`;
}

/**
 * Build a `HH:MM–HH:MM` (or just `HH:MM`) label for a single session tile.
 * Priority: an explicit `end_time`, else start + durationMinutes, else just
 * the start time.
 */
export function sessionTimeRangeWithEndTime(
  startTime: string,
  endTime: string | null | undefined,
  durationMinutes: number | null,
): string {
  const start = startTime.slice(0, 5);
  if (endTime) return `${start}–${endTime.slice(0, 5)}`;
  if (!durationMinutes || durationMinutes <= 0) return start;
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + durationMinutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${start}–${pad(endH)}:${pad(endM)}`;
}

/** "12. august" */
export function formatShortDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = toLocalDate(dateStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

/** "tir. 12. aug" — lowercase; wrap in `capitalize()` at the call site when
 * it leads a line (e.g. the Timeplan date cards). */
export function formatShortWeekdayDate(dateStr: string): string {
  const d = toLocalDate(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${SHORT_WEEKDAYS[d.getDay()]} ${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "tirsdag 12. august" — lowercase weekday (callers capitalize as needed). */
export function formatFullDate(dateStr: string): string {
  const d = toLocalDate(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

/** "YYYY-MM-DD HH:mm:ss" end-of-session key, lexically comparable against
 * `osloNowKey()`. Prefers the explicit `end_time` column, else start +
 * duration. Null when the session has no times. */
function sessionEndKey(
  s: Pick<CourseSession, 'session_date' | 'start_time' | 'end_time'>,
  durationMinutes: number | null,
): string | null {
  if (s.end_time) return `${s.session_date} ${s.end_time}`;
  if (!s.start_time) return null;
  const start = new Date(`${s.session_date}T${s.start_time}Z`);
  if (isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + (durationMinutes ?? 60) * 60000).toISOString();
  return `${end.slice(0, 10)} ${end.slice(11, 19)}`;
}

/** A session is "finished" once its end has passed (Oslo time). Display-only
 * — bookability comes from the tier RPC. */
export function hasSessionFinished(
  s: Pick<CourseSession, 'session_date' | 'start_time' | 'end_time'>,
  durationMinutes: number | null,
): boolean {
  const endKey = sessionEndKey(s, durationMinutes);
  if (!endKey) return s.session_date < osloTodayKey();
  return endKey <= osloNowKey();
}

/** First non-cancelled session whose start instant is still ahead in Oslo
 * time. Same comparison checkout uses to auto-pick the drop-in class. */
export function findNextUpcomingSession<T extends Pick<CourseSession, 'session_date' | 'start_time' | 'status'>>(
  sessions: T[],
): T | null {
  const now = osloNowKey();
  for (const s of sessions) {
    if (s.status === 'cancelled') continue;
    if (`${s.session_date} ${s.start_time ?? '23:59:59'}` > now) return s;
  }
  return null;
}

/** "I dag"/"I morgen" relative to Oslo's today, else "12. august". */
export function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const key = dateStr.slice(0, 10);
  const today = osloTodayKey();
  if (key === today) return 'I dag';
  if (key === nextDayKey(today)) return 'I morgen';
  const d = toLocalDate(key);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

/** YYYY-MM-DD of the day after `dateKey` (pure calendar arithmetic in UTC). */
function nextDayKey(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Sublabel for the drop-in tile — e.g. "I dag · 18:00". */
export function buildDropInSublabel(sessions: CourseSession[]): string | null {
  const next = findNextUpcomingSession(sessions);
  if (!next) return null;
  const dateLabel = formatRelativeDate(next.session_date);
  const time = next.start_time ? next.start_time.slice(0, 5) : null;
  if (dateLabel && time) return `${dateLabel} · ${time}`;
  return dateLabel || time || null;
}

/** "Neste økt: tir. 12. aug kl. 18:00" — the checkout Billett constraint
 * line for the drop-in tier. */
export function buildNextSessionLabel(
  session: { session_date: string; start_time: string } | null,
): string | null {
  if (!session) return null;
  const dateLabel = formatShortWeekdayDate(session.session_date);
  const time = session.start_time.slice(0, 5);
  return `Neste økt: ${dateLabel} kl. ${time}`;
}

/**
 * Constraint line under the checkout Billett toggle for the main/package
 * tier — "8 økter, tirsdager" for the full course, "6 økter igjen" once the
 * series has started and the tier is prorated.
 */
export function buildMainTierConstraintLabel(
  course: Pick<PublicCourseWithDetails, 'format' | 'start_date' | 'end_date' | 'total_weeks'>,
  tier: Pick<AvailableTicketType, 'weeks'>,
): string | null {
  if (course.format === 'series') {
    const weeks = tier.weeks ?? course.total_weeks;
    if (!weeks) return null;
    const prorated = course.total_weeks != null && weeks < course.total_weeks;
    if (prorated) return `${weeks} ${weeks === 1 ? 'økt' : 'økter'} igjen`;
    const startDate = course.start_date ? toLocalDate(course.start_date) : null;
    const weekday = startDate ? WEEKDAYS_PLURAL[startDate.getDay()] : null;
    return weekday ? `${weeks} økter, ${weekday}` : `${weeks} økter`;
  }
  const days = singleDayCount(course);
  return days > 1 ? `${days} dager` : null;
}

/**
 * Bold "when" line + muted subline for the course-detail fact band —
 * "Tirsdager kl. 18:00–19:30" / "12. august – 30. september, 8 økter" for a
 * series, degrading gracefully for single/multi-day courses.
 */
export function buildFactBandWhen(
  course: Pick<PublicCourseWithDetails, 'format' | 'start_date' | 'end_date' | 'total_weeks' | 'time_schedule' | 'duration'>,
  sessionCount: number,
): { bold: string; sub: string | null } {
  const timeRange = resolveTimeRange(course.time_schedule, course.duration);

  if (course.format === 'series') {
    const startDate = course.start_date ? toLocalDate(course.start_date) : null;
    const weekdayLabel = startDate ? capitalize(WEEKDAYS_PLURAL[startDate.getDay()]) : null;
    const bold = weekdayLabel
      ? (timeRange ? `${weekdayLabel} kl. ${timeRange}` : weekdayLabel)
      : (timeRange ? `Kl. ${timeRange}` : '');
    const startLabel = formatShortDate(course.start_date);
    const endLabel = formatShortDate(course.end_date);
    const rangeLabel = startLabel && endLabel && startLabel !== endLabel ? `${startLabel} – ${endLabel}` : startLabel;
    const count = sessionCount || course.total_weeks || null;
    const subParts = [rangeLabel, count ? `${count} ${count === 1 ? 'økt' : 'økter'}` : null].filter(
      (p): p is string => !!p,
    );
    return { bold, sub: subParts.length ? subParts.join(', ') : null };
  }

  const days = singleDayCount(course);
  if (days > 1) {
    const bold = timeRange ? `Kl. ${timeRange}` : 'Flere dager';
    const startLabel = formatShortDate(course.start_date);
    const endLabel = formatShortDate(course.end_date);
    return { bold, sub: startLabel && endLabel ? `${startLabel} – ${endLabel}` : null };
  }

  const dateLabel = formatShortDate(course.start_date);
  const bold = dateLabel
    ? (timeRange ? `${dateLabel} kl. ${timeRange}` : dateLabel)
    : (timeRange ? `Kl. ${timeRange}` : '');
  const startDate = course.start_date ? toLocalDate(course.start_date) : null;
  const sub = startDate ? capitalize(WEEKDAYS[startDate.getDay()]) : null;
  return { bold, sub };
}
