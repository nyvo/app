import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn, formatCoursePrice, formatKroner } from '@/lib/utils';
import { resolveCourseImage, type PublicCourseWithDetails } from '@/services/publicCourses';
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
 * row per session). Card contract, fixed slots: centered time · [thumbnail]
 * · title with a metadata second line · stacked price + state pill.
 *
 * The thumbnail slot is list-level, all-or-none: it renders only when EVERY
 * visible course resolves an image (own image or the studio's default course
 * image). Otherwise the whole list drops to the text-row grammar — the
 * ClassPass/Fresha schedule pattern — instead of padding gaps with blank
 * grey squares. A studio closes a gap by uploading the missing image or
 * setting a default course image, never by us inventing placeholder art.
 */
export function StudioAgendaList({ courses, viewingSlug, viewingName }: StudioAgendaListProps) {
  const todayKey = useMemo(() => dateKey(new Date()), []);
  const tomorrowKey = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return dateKey(d);
  }, []);

  const showThumbs = useMemo(
    () => courses.length > 0 && courses.every((course) => !!resolveCourseImage(course)),
    [courses],
  );

  // With a single instructor across the whole studio the name is studio
  // identity, not row information — repeating it on every row is noise.
  // It earns the sub-line only when it distinguishes rows (≥2 instructors).
  const showInstructor = useMemo(() => {
    const names = new Set<string>();
    for (const course of courses) {
      const name = course.instructor_name?.trim();
      if (name) names.add(name);
    }
    return names.size >= 2;
  }, [courses]);

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
      {groups.map(([key, groupCourses]) => (
        <section key={key} className="pt-6">
          <GroupHeading groupKey={key} todayKey={todayKey} tomorrowKey={tomorrowKey} />
          <ul className="mt-3 space-y-2">
            {groupCourses.map((course) => (
              <AgendaRow
                key={course.id}
                course={course}
                todayKey={todayKey}
                showThumb={showThumbs}
                showInstructor={showInstructor}
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
  showThumb,
  showInstructor,
  viewingSlug,
  viewingName,
}: {
  course: PublicCourseWithDetails;
  todayKey: string;
  showThumb: boolean;
  showInstructor: boolean;
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
  const sub = subLabel(course, showInstructor);
  const price = entryPrice(course);

  // Card anatomy mirrors the landing hero mock's «Neste kurs» rows: centered
  // time slot · title with its metadata on the second line · right meta.
  // All text full text-foreground — muted ink on the muted fill is
  // unreadable (see GetStartedPage's StepCard, the ratified filled card).
  const body = (
    <>
      <span className="w-12 sm:w-14 shrink-0 text-base font-medium tabular-nums text-foreground">
        {time || '—'}
      </span>

      {showThumb && <CourseThumb course={course} />}

      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-foreground">{course.title}</p>
        {sub && <p className="mt-0.5 text-sm text-foreground truncate">{sub}</p>}
      </div>

      {/* Fixed right slot: price stacked over the state pill on every row
        * (ratified over an inline variant). Scarcity is deliberately NOT
        * shown here — urgency copy lives on the detail page only. */}
      <div className="shrink-0 flex flex-col items-end gap-1.5">
        <span className="text-base font-medium tabular-nums whitespace-nowrap text-foreground">
          {price.from && price.amount ? (
            <>
              <span className="font-normal">fra </span>
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
              ? 'bg-background text-foreground group-hover:bg-foreground group-hover:text-background'
              : 'bg-background text-foreground-muted',
          )}
        >
          {BOOKABILITY_LABELS[bookability]}
        </span>
      </div>
    </>
  );

  // Each course is its own filled bg-muted card (the landing hero mock's
  // «Neste kurs» rows / GetStartedPage StepCard grammar) — the card is the
  // click target, day headings group the stack.
  const cardShell = 'flex items-center gap-3 sm:gap-4 rounded-xl bg-muted px-4 py-3.5';

  return (
    <li>
      {isCancelled ? (
        <div className={cn(cardShell, 'opacity-55')}>{body}</div>
      ) : (
        <Link
          to={`/${linkSlug}/${course.slug}`}
          state={{ fromSlug, fromName }}
          className={cn(
            'group transition-colors hover:bg-active',
            cardShell,
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
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

/** Metadata line under the title (the hero mock's second row): duration
 * first («90 min», «2 dager»), session count for a series, then instructor —
 * only when the list-level rule says it distinguishes rows (≥2 instructors
 * at the studio) — and «Nettkurs» for online delivery. Copy rule: one «·»
 * may pair two values; with three parts we fall back to commas — more than
 * one interpunct in a string is banned. */
function subLabel(course: PublicCourseWithDetails, showInstructor: boolean): string {
  const parts: string[] = [];
  const duration = durationLabel(course);
  if (duration) parts.push(duration);
  if (course.format === 'series') {
    const sessions = course.next_session?.total_sessions ?? course.total_weeks;
    if (sessions && sessions > 1) parts.push(`${sessions} økter`);
  }
  if (showInstructor && course.instructor_name) parts.push(course.instructor_name);
  if (course.delivery_mode === 'online') parts.push('Nettkurs');
  return parts.length > 2 ? parts.join(', ') : parts.join(' · ');
}

/** Only mounted when the whole list qualified for thumbnails, so `src` is
 * always set. The muted tile remains solely as the runtime error state for a
 * URL that fails to load — never a designed "no image" placeholder. */
function CourseThumb({ course }: { course: PublicCourseWithDetails }) {
  const src = resolveCourseImage(course);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <div aria-hidden className="size-16 shrink-0 rounded-lg bg-muted" />;
  }
  return (
    <img
      src={src}
      alt=""
      className="media-outline size-16 shrink-0 rounded-lg object-cover"
      onError={() => setFailed(true)}
    />
  );
}
