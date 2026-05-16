import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock, MapPin, Monitor, Users } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { cn, formatCoursePrice } from '@/lib/utils';
import type { PublicCourseWithDetails } from '@/services/publicCourses';

interface StudioMonthScheduleProps {
  courses: PublicCourseWithDetails[];
}

const WEEKDAYS_SHORT = ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'] as const;
const MONTHS = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
] as const;

const MIN_STRIP_DAYS = 14;
const MAX_STRIP_DAYS = 90;

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function extractTime(timeSchedule: string | null): string {
  if (!timeSchedule) return '';
  const m = timeSchedule.match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : '';
}

function extractTimeValue(timeSchedule: string | null): number {
  if (!timeSchedule) return 9999;
  const m = timeSchedule.match(/(\d{1,2}):(\d{2})/);
  if (!m) return 9999;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function formatTimeRange(startTime: string, durationMinutes: number | null): string {
  if (!startTime) return '';
  if (!durationMinutes || durationMinutes <= 0) return startTime;
  const m = startTime.match(/(\d{1,2}):(\d{2})/);
  if (!m) return startTime;
  const totalMinutes = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + durationMinutes;
  const endHours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const endMinutes = totalMinutes % 60;
  const endStr = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  return `${startTime} – ${endStr}`;
}

/**
 * Calendly-style day strip: scrollable row of bordered day cards under
 * a month label. Tapping a day filters the class list below. Studio
 * stays monochrome — the success dot is the one status signal we allow.
 */
export function StudioMonthSchedule({ courses }: StudioMonthScheduleProps) {
  const location = useLocation();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [selectedKey, setSelectedKey] = useState(() => toKey(today));

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
    // Day card 112px wide + 12px gap (gap-3) = 124px stride.
    // Use the card at viewport center so the heading reflects what's truly
    // in view, not what's just barely peeking past the left padding.
    const viewportCenter = el.scrollLeft + el.clientWidth / 2;
    const idx = Math.max(0, Math.floor((viewportCenter - 16) / 124));
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
    const todayKey = toKey(today);
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
      const last = new Date(maxKey);
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
    const d = days.find(x => toKey(x) === selectedKey);
    return d ?? today;
  }, [days, selectedKey, today]);

  const selectedCourses = buckets.get(selectedKey) ?? [];
  const headingDay = days[Math.min(visibleIndex, days.length - 1)] ?? selectedDay;
  const monthLabel = MONTHS[headingDay.getMonth()];

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
      <header>
        <h2 className="text-xl font-semibold capitalize text-foreground">{monthLabel}</h2>
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
            const key = toKey(day);
            const dayCourses = buckets.get(key) ?? [];
            const count = dayCourses.length;
            const hasClasses = count > 0;
            const isSelected = key === selectedKey;
            const isToday = key === toKey(today);
            const weekday = WEEKDAYS_SHORT[day.getDay()];

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleDayClick(key)}
                aria-pressed={isSelected}
                className={cn(
                  'shrink-0 w-28 rounded-lg border border-border px-4 py-3 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40',
                  isSelected
                    ? 'bg-muted'
                    : hasClasses
                      ? 'bg-surface hover:bg-muted/60'
                      : 'bg-surface hover:bg-muted/40',
                )}
              >
                <div
                  className={cn(
                    'text-xs font-medium text-foreground-muted',
                    !isToday && 'capitalize',
                  )}
                >
                  {isToday ? 'I dag' : weekday}
                </div>
                <div
                  className={cn(
                    'mt-1 text-2xl font-semibold tabular-nums leading-none',
                    hasClasses ? 'text-foreground' : 'text-foreground-muted',
                  )}
                >
                  {day.getDate()}
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs">
                  {hasClasses ? (
                    <>
                      <span className="size-1.5 rounded-full bg-success" aria-hidden />
                      <span className="text-foreground">
                        {count} {count === 1 ? 'klasse' : 'klasser'}
                      </span>
                    </>
                  ) : (
                    <span className="text-foreground-muted">Ingen klasser</span>
                  )}
                </div>
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

      {selectedCourses.length === 0 ? (
        <p className="py-10 text-center text-sm text-foreground-muted">
          Ingen klasser denne dagen.
        </p>
      ) : (
        <div className="space-y-3">
          {selectedCourses.map(course => {
            const time = extractTime(course.time_schedule);
            const studioSlug = course.seller?.slug ?? '';
            const isFull = course.max_participants !== null && course.spots_available <= 0;
            const isCancelled = course.status === 'cancelled';
            return (
              <Link
                key={course.id}
                to={`/${studioSlug}/${course.slug}`}
                state={{ backgroundLocation: location }}
                className={cn(
                  'block rounded-xl border border-border bg-surface p-6 transition-colors',
                  'hover:bg-muted/60',
                  (isFull || isCancelled) && 'text-foreground-muted',
                )}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-base font-medium text-foreground truncate">
                    {course.title}
                  </h3>
                  <span className="text-sm font-medium tabular-nums text-foreground whitespace-nowrap">
                    {formatCoursePrice(course.price)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-foreground-muted">
                  {time && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-3.5" strokeWidth={1.75} />
                      <span className="tabular-nums">
                        {formatTimeRange(time, course.duration)}
                      </span>
                    </span>
                  )}
                  {course.delivery_mode === 'online' ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Monitor className="size-3.5" strokeWidth={1.75} />
                      <span>Online</span>
                    </span>
                  ) : course.location ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" strokeWidth={1.75} />
                      <span className="truncate max-w-xs">{course.location}</span>
                    </span>
                  ) : null}
                  {course.max_participants !== null && (
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-3.5" strokeWidth={1.75} />
                      {isFull ? (
                        <span>Fullt</span>
                      ) : (
                        <span>
                          {course.spots_available}/{course.max_participants} plasser
                        </span>
                      )}
                    </span>
                  )}
                  {isCancelled && (
                    <Badge variant="outline" size="sm">Avlyst</Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
