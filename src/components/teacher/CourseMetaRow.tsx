import { Calendar, Clock, MapPin } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { toLocalDate } from '@/utils/dateUtils';

/**
 * CourseMetaRow — the shared "date · time · place" line shown under a course
 * title (CoursePage header) and in the schedule drawer header. Each item
 * renders only when its value is present, so callers omit what they don't
 * want: the drawer skips `location` (too wide for the narrow sheet), the
 * detail page shows all three. Format-agnostic — the caller decides how the
 * strings read (long vs short weekday, etc).
 */
export function CourseMetaRow({
  date,
  time,
  location,
  className,
}: {
  date?: string | null;
  time?: string | null;
  location?: string | null;
  className?: string;
}) {
  if (!date && !time && !location) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-foreground-muted',
        className,
      )}
    >
      {date && (
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="size-3.5 shrink-0" strokeWidth={1.75} />
          {date}
        </span>
      )}
      {time && (
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Clock className="size-3.5 shrink-0" strokeWidth={1.75} />
          {time}
        </span>
      )}
      {location && (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0" strokeWidth={1.75} />
          <span className="truncate">{location}</span>
        </span>
      )}
    </div>
  );
}

const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

// "2026-07-04" → "4. jul" — compact day+month for session-list rows (no
// weekday, no year). Distinct from `formatCourseDate` below (long form, for
// headers).
export function formatSessionDate(dateStr: string): string {
  // Local-safe parse — `new Date('YYYY-MM-DD')` is UTC and lands a day early
  // west of UTC.
  const d = toLocalDate(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

// "06:00" + 60 → "06:00–07:00". Falls back to the raw start if unparseable.
export function buildTimeRange(startTime: string, durationMinutes: number): string {
  const start = startTime.slice(0, 5);
  if (!durationMinutes || durationMinutes <= 0) return start;
  const [h, m] = start.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return start;
  const total = h * 60 + m + durationMinutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${start}–${pad(endH)}:${pad(endM)}`;
}

/**
 * The next session dated today-or-later (local midnight) — the upcoming class.
 * Returns null when every session is in the past. Generic so callers don't
 * have to import the full session type; session_date is a 'YYYY-MM-DD' string,
 * which sorts chronologically as plain text.
 */
export function nextUpcomingSession<T extends { session_date: string }>(
  sessions: T[],
): T | null {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return sessions
    .filter((s) => s.session_date >= todayKey)
    .reduce<T | null>((min, s) => (!min || s.session_date < min.session_date ? s : min), null);
}

// "2026-06-09" → "tirsdag 9. juni" (nb-NO, lowercase weekday). '' on bad input.
export function formatCourseDate(input: string | null | undefined): string {
  if (!input) return '';
  // Local-safe parse so a date-only `YYYY-MM-DD` doesn't shift a day west of UTC.
  const date = toLocalDate(input);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}
