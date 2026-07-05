import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Monitor, User } from '@/lib/icons';
import { cn, formatCoursePrice, formatKroner } from '@/lib/utils';
import type { PublicCourseWithDetails } from '@/services/publicCourses';
import { toLocalDate } from '@/utils/dateUtils';
import {
  MONTHS_NB,
  WEEKDAYS_SHORT_NB,
  courseBookability,
  dateKey,
  entryPrice,
  extractTime,
  extractTimeValue,
  formatLongDay,
  formatTimeRange,
} from './studioFacts';

interface StudioDayListProps {
  courses: PublicCourseWithDetails[];
  /** The storefront slug + name the user is currently viewing. Passed to
   * detail-page navigation as `state.fromSlug` / `state.fromName` so the
   * back link resolves to where the user came from (not the course owner)
   * in syndicated cases. */
  viewingSlug?: string;
  viewingName?: string | null;
  /** Compact control rendered on the month-heading row (e.g. the filter
   * pills) so there's one control band above the day strip. */
  headerAction?: React.ReactNode;
}

const MIN_STRIP_DAYS = 14;
const MAX_STRIP_DAYS = 90;

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Day strip + image-led class rows. The strip stays from the original
 * schedule (it works); the rows are redesigned around the course image —
 * the single biggest visual step away from a bare booking list. Meta is
 * plain text (time · instructor · place), scarcity is the one warning
 * accent, and the per-row CTA inverts on hover (monochrome, like the
 * filter chips).
 */
export function StudioDayList({ courses, viewingSlug, viewingName, headerAction }: StudioDayListProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [selectedKey, setSelectedKey] = useState(() => dateKey(today));

  const scrollerRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: false });
  const [scrollState, setScrollState] = useState({ canLeft: false, canRight: false });
  const [visibleIndex, setVisibleIndex] = useState(0);

  const updateScrollState = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setScrollState({
      canLeft: el.scrollLeft > 4,
      canRight: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
    // Measure the pill stride (width + gap) off the DOM instead of
    // hardcoding it, so restyling the strip can't desync the month label.
    // Use the pill at viewport center so the heading reflects what's truly
    // in view, not what's just barely peeking past the left padding.
    const track = el.firstElementChild;
    const first = track?.children[0] as HTMLElement | undefined;
    const second = track?.children[1] as HTMLElement | undefined;
    const stride = first && second
      ? second.offsetLeft - first.offsetLeft
      : first?.offsetWidth || 1;
    const viewportCenter = el.scrollLeft + el.clientWidth / 2;
    const idx = Math.max(0, Math.floor((viewportCenter - 16) / stride));
    setVisibleIndex(idx);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = scrollerRef.current;
    if (!el) return;
    drag.current = { down: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.down) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startLeft - dx;
    updateScrollState();
  };

  const endDrag = () => {
    drag.current.down = false;
  };

  const handleDayClick = (key: string) => {
    if (drag.current.moved) {
      drag.current.moved = false;
      return;
    }
    setSelectedKey(key);
  };

  const buckets = useMemo(() => {
    const map = new Map<string, PublicCourseWithDetails[]>();
    const todayKey = dateKey(today);
    for (const c of courses) {
      // Use every upcoming session so weekly recurring courses appear on each
      // future date they run, not only on their next occurrence.
      const dates = c.upcoming_session_dates.length > 0
        ? c.upcoming_session_dates
        : c.next_session?.session_date
          ? [c.next_session.session_date]
          : c.start_date
            ? [c.start_date]
            : [];
      for (const raw of dates) {
        const key = raw.slice(0, 10);
        if (key < todayKey) continue;
        const arr = map.get(key);
        if (arr) {
          if (!arr.includes(c)) arr.push(c);
        } else {
          map.set(key, [c]);
        }
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => extractTimeValue(a.time_schedule) - extractTimeValue(b.time_schedule));
    }
    return map;
  }, [courses, today]);

  // Strip ends on the last day that actually has a class (or MIN_STRIP_DAYS,
  // whichever is later) so the rightmost card is always "real" — no trailing
  // empty days that just look like padding. Capped at MAX_STRIP_DAYS so a
  // year-long programme doesn't generate a 365-card strip.
  const days = useMemo(() => {
    let maxKey = '';
    for (const key of buckets.keys()) if (key > maxKey) maxKey = key;
    let stripLen = MIN_STRIP_DAYS;
    if (maxKey) {
      const last = toLocalDate(maxKey);
      last.setHours(0, 0, 0, 0);
      stripLen = Math.max(MIN_STRIP_DAYS, Math.min(MAX_STRIP_DAYS, daysBetween(today, last) + 1));
    }
    const out: Date[] = [];
    for (let i = 0; i < stripLen; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      out.push(d);
    }
    return out;
  }, [buckets, today]);

  const selectedDay = useMemo(() => {
    const d = days.find(x => dateKey(x) === selectedKey);
    return d ?? today;
  }, [days, selectedKey, today]);

  const selectedCourses = buckets.get(selectedKey) ?? [];
  const headingDay = days[Math.min(visibleIndex, days.length - 1)] ?? selectedDay;
  const monthLabel = MONTHS_NB[headingDay.getMonth()];

  useEffect(() => {
    updateScrollState();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [days.length]);

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-medium capitalize text-foreground">{monthLabel}</h2>
        {headerAction}
      </header>

      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8">
        <div
          ref={scrollerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
          className="px-4 sm:px-6 lg:px-8 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none"
          aria-label="Velg dag"
        >
          <div className="flex gap-3">
            {days.map(day => {
              const key = dateKey(day);
              const count = (buckets.get(key) ?? []).length;
              const hasClasses = count > 0;
              const isSelected = key === selectedKey;
              const isToday = key === dateKey(today);
              const weekday = WEEKDAYS_SHORT_NB[day.getDay()];
              const countLabel = hasClasses ? `${count} kurs` : 'Ingen kurs';

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleDayClick(key)}
                  aria-pressed={isSelected}
                  aria-label={`${formatLongDay(day)}, ${countLabel}`}
                  className={cn(
                    // Sized so a desktop row shows ~7 days with the next card
                    // cut by the viewport edge — the cut card signals scroll.
                    'shrink-0 w-28 sm:w-34 rounded-2xl px-2 py-4 flex flex-col items-center gap-1.5 transition-[background-color,opacity]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    // Fill-only states, no borders: the dark neutral fill IS
                    // the selection and moves with it; today is marked by the
                    // "I dag" label. Active = soft tile, inactive = dimmed.
                    isSelected
                      ? 'bg-foreground text-background'
                      : hasClasses
                        ? 'bg-muted hover:bg-border-subtle/60'
                        : 'bg-muted opacity-60 hover:opacity-80',
                  )}
                >
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isSelected ? 'text-background/70' : 'text-foreground-muted',
                      !isToday && 'capitalize',
                    )}
                  >
                    {isToday ? 'I dag' : weekday}
                  </span>
                  <span
                    className={cn(
                      'text-2xl font-medium tabular-nums leading-none',
                      !isSelected && 'text-foreground',
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <span
                    className={cn(
                      'text-sm whitespace-nowrap',
                      isSelected ? 'text-background/70' : 'text-foreground-muted',
                    )}
                  >
                    {countLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {scrollState.canLeft && (
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-16 bg-gradient-to-r from-background to-transparent" />
        )}
        {scrollState.canRight && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-16 bg-gradient-to-l from-background to-transparent" />
        )}
      </div>

      {/* Re-keyed so switching day cross-fades the list. */}
      <div key={selectedKey} className="animate-in fade-in duration-200">
        {selectedCourses.length === 0 ? (
          <p className="py-10 text-center text-base text-foreground-muted">
            {selectedKey === dateKey(today)
              ? 'Ingen flere kurs i dag.'
              : 'Ingen kurs denne dagen.'}
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {selectedCourses.map(course => (
              <ClassRow
                key={course.id}
                course={course}
                todayKey={dateKey(today)}
                viewingSlug={viewingSlug}
                viewingName={viewingName}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const CTA_LABELS: Record<ReturnType<typeof courseBookability>, string> = {
  open: 'Reserver',
  full: 'Fullt',
  closed: 'Stengt',
  cancelled: 'Avlyst',
};

function ClassRow({
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
  const time = extractTime(course.time_schedule);
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
  const isDisabled = bookability !== 'open';
  // Cancelled courses stay listed through the 30-day grace window, but the
  // detail fetch excludes them — a link would dead-end on an error page. Full
  // and closed courses keep working detail pages, so only cancelled rows go
  // inert.
  const isCancelled = bookability === 'cancelled';

  const price = entryPrice(course);
  const placeLabel = course.delivery_mode === 'online' ? 'Nettkurs' : course.location;

  const body = (
    <>
      <div className="min-w-0 flex-1">
        <h4 className="text-base font-medium truncate text-foreground">
          {course.title}
        </h4>
        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-foreground-muted">
          {time && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden />
              <span className="tabular-nums">{formatTimeRange(time, course.duration)}</span>
            </span>
          )}
          {course.instructor_name && (
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <User className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{course.instructor_name}</span>
            </span>
          )}
          {placeLabel && (
            <span className="inline-flex items-center gap-1.5 min-w-0">
              {course.delivery_mode === 'online'
                ? <Monitor className="size-3.5 shrink-0" aria-hidden />
                : <MapPin className="size-3.5 shrink-0" aria-hidden />}
              <span className="truncate max-w-56">{placeLabel}</span>
            </span>
          )}
        </p>
      </div>

      <div className="shrink-0 flex flex-col items-end justify-between gap-2 self-stretch py-0.5">
        <span className="text-base font-medium tabular-nums whitespace-nowrap text-foreground">
          {price.from && price.amount
            ? <><span className="font-normal text-foreground-muted">fra </span>{formatKroner(price.amount)}</>
            : formatCoursePrice(price.amount)}
        </span>
        <span
          className={cn(
            'inline-flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors duration-150',
            isDisabled
              ? 'bg-muted text-foreground-muted'
              : 'bg-muted text-foreground group-hover:bg-foreground group-hover:text-background',
          )}
          aria-hidden
        >
          {CTA_LABELS[bookability]}
        </span>
      </div>
    </>
  );

  return (
    <li>
      {isCancelled ? (
        <div className="flex items-center gap-4 sm:gap-5 py-5 -mx-3 px-3 rounded-xl">
          {body}
        </div>
      ) : (
        <Link
          to={`/${linkSlug}/${course.slug}`}
          state={{ fromSlug, fromName }}
          className={cn(
            'group flex items-center gap-4 sm:gap-5 py-5',
            '-mx-3 px-3 rounded-xl transition-colors hover:bg-muted/50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          )}
          aria-disabled={isDisabled || undefined}
        >
          {body}
        </Link>
      )}
    </li>
  );
}
