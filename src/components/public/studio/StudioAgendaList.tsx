import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn, formatCoursePrice, formatKroner } from '@/lib/utils';
import type { PublicCourseWithDetails } from '@/services/publicCourses';
import { toLocalDate } from '@/utils/dateUtils';
import {
  courseBookability,
  dateKey,
  entryPrice,
  extractTime,
  extractTimeValue,
  formatLongDay,
} from './studioFacts';
import { BOOKABILITY_LABELS } from '@/lib/bookability-labels';

interface StudioAgendaListProps {
  courses: PublicCourseWithDetails[];
  /** The storefront slug + name the user is currently viewing. Passed to
   * detail-page navigation as `state.fromSlug` / `state.fromName` so the
   * back link resolves to where the user came from (not the course owner)
   * in syndicated cases. */
  viewingSlug?: string;
  viewingName?: string | null;
}

/**
 * Date-grouped agenda (ClassPass venue-schedule grammar): one continuous
 * list where the date headers are the navigation — no day strip, days
 * without courses simply don't render. Every course is exactly one row on
 * its display date (a series says «8 økter» on the second line, never one
 * row per session). Row contract, five fixed slots: time/duration stack ·
 * image · title/details·instructor stack · price · scarcity text.
 */
export function StudioAgendaList({ courses, viewingSlug, viewingName }: StudioAgendaListProps) {
  const todayKey = useMemo(() => dateKey(new Date()), []);
  const tomorrowKey = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return dateKey(d);
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, PublicCourseWithDetails[]>();
    for (const course of courses) {
      const key = displayDateKey(course) ?? UNDATED_KEY;
      const list = map.get(key);
      if (list) list.push(course);
      else map.set(key, [course]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => extractTimeValue(a.time_schedule) - extractTimeValue(b.time_schedule));
    }
    // Ascending by date; undated courses sort last (UNDATED_KEY > any ISO date).
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
  }, [courses]);

  return (
    <div>
      {groups.map(([key, groupCourses], index) => (
        <section
          key={key}
          className={cn('pt-6', index > 0 && 'mt-4 border-t border-border-subtle')}
        >
          <GroupHeading groupKey={key} todayKey={todayKey} tomorrowKey={tomorrowKey} />
          <ul className="mt-1">
            {groupCourses.map((course) => (
              <AgendaRow
                key={course.id}
                course={course}
                todayKey={todayKey}
                viewingSlug={viewingSlug}
                viewingName={viewingName}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Sorts after every ISO date ("~" > "9"), so undated courses group last. */
const UNDATED_KEY = '~';

/** The one date a course renders under: its next upcoming session, falling
 * back to the start date. Null for courses without any date. */
function displayDateKey(course: PublicCourseWithDetails): string | null {
  const raw = course.next_session?.session_date ?? course.start_date;
  return raw ? raw.slice(0, 10) : null;
}

function GroupHeading({
  groupKey,
  todayKey,
  tomorrowKey,
}: {
  groupKey: string;
  todayKey: string;
  tomorrowKey: string;
}) {
  if (groupKey === UNDATED_KEY) {
    return <h3 className="text-base font-medium text-foreground">Dato kommer</h3>;
  }

  const longDay = formatLongDay(toLocalDate(groupKey));
  const relative = groupKey === todayKey ? 'I dag' : groupKey === tomorrowKey ? 'I morgen' : null;

  return (
    <h3 className="text-base font-medium text-foreground">
      {relative ? (
        <>
          {relative}
          <span className="ml-2.5 text-sm font-normal text-foreground-muted">{longDay}</span>
        </>
      ) : (
        <span className="inline-block first-letter:uppercase">{longDay}</span>
      )}
    </h3>
  );
}

function AgendaRow({
  course,
  todayKey,
  viewingSlug,
  viewingName,
}: {
  course: PublicCourseWithDetails;
  todayKey: string;
  viewingSlug?: string;
  viewingName?: string | null;
}) {
  const ownerSlug = course.seller?.slug ?? '';
  // Link to the storefront the visitor is currently on. The detail page
  // canonicalizes to the owner's slug when it differs. For affiliated
  // teachers (no owning team of their own) ownerSlug is empty — without
  // this fallback the Link gets `//<slug>` which browsers parse as a
  // protocol-relative host.
  const linkSlug = viewingSlug || ownerSlug;
  const fromSlug = viewingSlug ?? ownerSlug;
  const fromName = viewingName ?? course.seller?.name ?? null;

  const bookability = courseBookability(course, todayKey);
  // Cancelled courses stay listed through the 30-day grace window, but the
  // detail fetch excludes them — a link would dead-end on an error page.
  // Full and closed courses keep working detail pages, so only cancelled
  // rows go inert.
  const isCancelled = bookability === 'cancelled';

  const time = extractTime(course.time_schedule);
  const duration = durationLabel(course);
  const sub = subLabel(course);
  const price = entryPrice(course);

  const body = (
    <>
      <span className="w-12 sm:w-14 shrink-0 flex flex-col gap-0.5">
        <span className="text-base font-medium tabular-nums text-foreground">{time || '—'}</span>
        {duration && (
          <span className="text-sm text-foreground-muted whitespace-nowrap">{duration}</span>
        )}
      </span>

      <CourseThumb course={course} />

      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-foreground">{course.title}</p>
        {sub && <p className="mt-0.5 text-sm text-foreground-muted truncate">{sub}</p>}
      </div>

      {/* Fixed right column: price always renders (also on full/cancelled
        * rows), the pill under it carries the bookable state. Scarcity is
        * deliberately NOT shown here — urgency copy lives on the detail
        * page only. */}
      <div className="shrink-0 flex flex-col items-end gap-1.5">
        <span className="text-base font-medium tabular-nums whitespace-nowrap text-foreground">
          {price.from && price.amount ? (
            <>
              <span className="font-normal text-foreground-muted">fra </span>
              {formatKroner(price.amount)}
            </>
          ) : (
            formatCoursePrice(price.amount)
          )}
        </span>
        <span
          className={cn(
            'inline-flex h-8 items-center rounded-full px-3 text-sm font-medium transition-colors duration-150',
            bookability === 'open'
              ? 'bg-muted text-foreground group-hover:bg-foreground group-hover:text-background'
              : 'bg-muted text-foreground-muted',
          )}
        >
          {BOOKABILITY_LABELS[bookability]}
        </span>
      </div>
    </>
  );

  return (
    <li
      className={cn(
        'border-t border-border-subtle first:border-t-0 transition-colors duration-150',
        // The rounded hover fill overlaps the hairlines above and below the
        // row — fade out the two that touch it: the row's own top border and
        // the next row's. Keyed on a:hover so inert (cancelled) rows keep
        // their dividers.
        '[&:has(>a:hover)]:border-transparent [li:has(>a:hover)+&]:border-transparent',
      )}
    >
      {isCancelled ? (
        <div className="flex items-center gap-3 sm:gap-4 py-4 opacity-55">{body}</div>
      ) : (
        <Link
          to={`/${linkSlug}/${course.slug}`}
          state={{ fromSlug, fromName }}
          className={cn(
            'group flex items-center gap-3 sm:gap-4 py-4 -mx-3 px-3 rounded-xl transition-colors hover:bg-hover',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
        >
          {body}
        </Link>
      )}
    </li>
  );
}

/** Second line of the time stack — always a duration, so the slot reads
 * the same on every row: a multi-day workshop reads «2 dager», otherwise
 * the per-session length in minutes. */
function durationLabel(course: PublicCourseWithDetails): string {
  if (
    course.format === 'single'
    && course.start_date
    && course.end_date
    && course.end_date > course.start_date
  ) {
    const ms = toLocalDate(course.end_date).getTime() - toLocalDate(course.start_date).getTime();
    const days = Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
    if (days > 1) return `${days} dager`;
  }
  if (course.duration && course.duration > 0) return `${course.duration} min`;
  return '';
}

/** Second line of the title stack: «8 økter · Ingrid Larsen» for a series,
 * instructor alone for a workshop or drop-in class — no type chips. Online
 * delivery is a detail, so «Nettkurs» lives here, not in the time stack.
 * Copy rule: one «·» may pair two values; with three parts we fall back to
 * commas — more than one interpunct in a string is banned. */
function subLabel(course: PublicCourseWithDetails): string {
  const parts: string[] = [];
  if (course.format === 'series') {
    const sessions = course.next_session?.total_sessions ?? course.total_weeks;
    if (sessions && sessions > 1) parts.push(`${sessions} økter`);
  }
  if (course.instructor_name) parts.push(course.instructor_name);
  if (course.delivery_mode === 'online') parts.push('Nettkurs');
  return parts.length > 2 ? parts.join(', ') : parts.join(' · ');
}

function CourseThumb({ course }: { course: PublicCourseWithDetails }) {
  const src = course.image_url || course.seller?.default_course_image_url || null;
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <div aria-hidden className="size-16 shrink-0 rounded-lg bg-muted" />;
  }
  return (
    <img
      src={src}
      alt=""
      className="size-16 shrink-0 rounded-lg object-cover"
      onError={() => setFailed(true)}
    />
  );
}
