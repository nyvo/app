import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { cn, formatCoursePrice, formatKroner } from '@/lib/utils';
import type { PublicCourseWithDetails } from '@/services/publicCourses';
import {
  courseBookability,
  entryPrice,
  extractTime,
  extractTimeValue,
  formatLongDay,
} from '@/components/public/studio/studioFacts';
import { BOOKABILITY_LABELS } from '@/lib/bookability-labels';

interface EmbedCalendarProps {
  courses: PublicCourseWithDetails[];
  /** The storefront slug the visitor loaded — used to build the out-links to
   * the course detail page (which canonicalizes to the owner's slug). */
  slug: string;
  sellerName?: string | null;
}

// Norwegian day/month names are lowercase; only the sentence-initial letter is
// capitalized ("Mandag 6. juli" — never CSS `capitalize`, which would wrongly
// uppercase the month too).
function sentenceCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const MONTHS_NB = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
] as const;

// Monday-start weekday initials for the compact header row.
const WEEKDAY_INITIALS = ['M', 'T', 'O', 'T', 'F', 'L', 'S'] as const;

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 0 = Mon, 6 = Sun (Norwegian week starts on Monday).
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/**
 * Embeddable calendar — a self-contained card. Two panes: a compact circular
 * month picker on the left and the selected day's classes on the right;
 * stacks vertically when narrow (container query, so it tracks the iframe
 * width). Course rows are plain out-links that open the detail page on our
 * app in a new tab (booking happens there). Styled with the app's semantic
 * tokens, so it adapts to theme automatically; azure (`--primary`) marks
 * availability on the calendar — has bookable classes — while selection is
 * solid primary and bookable class rows sit on the same subtle tint; CTAs
 * stay monochrome per the storefront convention.
 * Month navigation is clamped to [current month, last month with classes] —
 * there is never content outside that range, so the chevrons disable at the
 * bounds instead of paging into dead months.
 */
export function EmbedCalendar({ courses, slug, sellerName }: EmbedCalendarProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayKey = toKey(today);

  // Bucket every upcoming session by date, skipping past days. Same fallback
  // chain the storefront day strip uses so recurring series appear each week.
  const buckets = useMemo(() => {
    const map = new Map<string, PublicCourseWithDetails[]>();
    for (const c of courses) {
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
  }, [courses, todayKey]);

  // Default selection: today when it has classes, otherwise the first upcoming
  // day with classes (today as the last resort). Kept as a render-time
  // resolution — state stays null until the visitor actually picks a day.
  const firstAvailableKey = useMemo(() => {
    if (buckets.has(todayKey)) return todayKey;
    let earliest: string | null = null;
    for (const key of buckets.keys()) {
      if (earliest === null || key < earliest) earliest = key;
    }
    return earliest;
  }, [buckets, todayKey]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const effectiveKey = selectedKey ?? firstAvailableKey ?? todayKey;

  // Open the calendar on the month of the initially shown day, so the default
  // selection is visible even when the next class is in a later month.
  const [cursor, setCursor] = useState(() => {
    const [y, m] = effectiveKey.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });

  // Build the 42-cell window: starts on the Monday on/before the 1st of the
  // cursor month. (Copied date math from StudioMonthGrid — not imported, so the
  // square/app-token version stays untouched.)
  const cells = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(1 - mondayIndex(cursor));
    const out: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push(d);
    }
    return out;
  }, [cursor]);

  const monthLabel = `${MONTHS_NB[cursor.getMonth()]} ${cursor.getFullYear()}`;

  // Navigation is clamped to where content can exist: from the current month
  // (buckets never contain past days) to the last month with classes. Both
  // chevrons disabled = only this month has anything to show.
  const minMonthIndex = today.getFullYear() * 12 + today.getMonth();
  const maxMonthIndex = useMemo(() => {
    let max = minMonthIndex;
    for (const key of buckets.keys()) {
      const [y, m] = key.split('-').map(Number);
      max = Math.max(max, y * 12 + (m - 1));
    }
    return max;
  }, [buckets, minMonthIndex]);
  const cursorMonthIndex = cursor.getFullYear() * 12 + cursor.getMonth();

  const goMonth = (delta: number) => {
    setCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const selectedDate = useMemo(() => {
    const [y, m, d] = effectiveKey.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [effectiveKey]);

  const selectedCourses = buckets.get(effectiveKey) ?? [];

  return (
    <div
      className="@container overflow-hidden rounded-2xl border border-border bg-background text-foreground"
    >
      <h1 className="sr-only">{sellerName ? `Kalender – ${sellerName}` : 'Kalender'}</h1>
      <div className="flex flex-col @2xl:flex-row">
        {/* ── Calendar pane ─────────────────────────────────────────── */}
        {/* Below @2xl the grid is fluid: cells are aspect-square and split
            whatever width the iframe gives us into 7 equal columns, so day
            buttons stay tappable no matter how narrow the embed is. At @2xl
            it locks back to the fixed pixel grid this comment used to
            describe: 7×36px cells + 6×6px gaps (288px grid) + 2×20px p-5 =
            328px. */}
        <section className="shrink-0 p-5 @2xl:w-[328px]">
          {/* max-w-72 = the old fixed grid width (7×36px + 6×6px gaps = 288px),
              so wider embeds render exactly as before; only genuinely narrow
              ones shrink the cells. */}
          <div className="mx-auto w-full max-w-72 @2xl:mx-0 @2xl:w-fit @2xl:max-w-none">
            <header className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium tabular-nums first-letter:uppercase text-foreground">
                {monthLabel}
              </h2>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => goMonth(-1)}
                  disabled={cursorMonthIndex <= minMonthIndex}
                  className="text-foreground-muted"
                  aria-label="Forrige måned"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => goMonth(1)}
                  disabled={cursorMonthIndex >= maxMonthIndex}
                  className="text-foreground-muted"
                  aria-label="Neste måned"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </header>

            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAY_INITIALS.map((d, i) => (
                <div
                  key={i}
                  className="flex h-7 items-center justify-center text-[0.6875rem] font-medium uppercase text-foreground-muted"
                  aria-hidden
                >
                  {d}
                </div>
              ))}

              {cells.map(cell => {
                const key = toKey(cell);
                const inMonth = cell.getMonth() === cursor.getMonth();
                const isToday = key === todayKey;
                const isSelected = key === effectiveKey;
                const hasClasses = (buckets.get(key)?.length ?? 0) > 0;

                // Out-of-month days are blanks — pure whitespace reads calmer
                // than dimmed numbers in a compact picker.
                if (!inMonth) {
                  return <div key={key} className="aspect-square w-full @2xl:size-9" aria-hidden />;
                }

                // In-month days without classes aren't targets: plain faint
                // text, no button, no hover. Today stays clickable so the
                // visitor can land on the "Ingen flere kurs i dag." state.
                if (!hasClasses && !isToday) {
                  return (
                    <div
                      key={key}
                      className="flex aspect-square w-full items-center justify-center text-sm tabular-nums text-foreground-disabled @2xl:size-9"
                    >
                      <span className="leading-none">{cell.getDate()}</span>
                    </div>
                  );
                }

                return (
                  <div key={key} className="flex aspect-square w-full items-center justify-center @2xl:size-9">
                    <button
                      type="button"
                      onClick={() => setSelectedKey(key)}
                      aria-pressed={isSelected}
                      aria-label={`${cell.getDate()}. ${MONTHS_NB[cell.getMonth()]}${hasClasses ? ', har kurs' : ''}`}
                      className={cn(
                        'motion-press flex size-full items-center justify-center rounded-full text-sm tabular-nums',
                        'active:scale-[0.96] motion-reduce:active:scale-100',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        isSelected
                          ? 'bg-primary font-medium text-primary-foreground'
                          : hasClasses
                            ? 'bg-primary-subtle text-primary hover:bg-primary-border'
                            : 'text-foreground hover:bg-hover',
                        isToday && !isSelected && 'ring-1 ring-inset ring-border',
                      )}
                    >
                      <span className="leading-none">{cell.getDate()}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Classes pane ──────────────────────────────────────────── */}
        <section className="min-w-0 flex-1 border-t border-border-subtle p-5 @2xl:border-l @2xl:border-t-0">
          {/* At @2xl the heading centers inside the same 40px line the month
              header's icon buttons define, so both panes share one optical
              top line and the class rows align with the weekday row. */}
          <h3 className="mb-3 text-[0.9375rem] font-medium text-foreground @2xl:mb-4 @2xl:flex @2xl:h-10 @2xl:items-center">
            {sentenceCase(formatLongDay(selectedDate))}
          </h3>

          <div key={effectiveKey} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
            {selectedCourses.length === 0 ? (
              <p className="py-12 text-center text-sm text-foreground-muted">
                {effectiveKey === todayKey
                  ? 'Ingen flere kurs i dag.'
                  : 'Ingen kurs denne dagen.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {selectedCourses.map(course => (
                  <EmbedClassRow
                    key={course.id}
                    course={course}
                    todayKey={todayKey}
                    slug={slug}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-border-subtle px-5 py-3">
        {/* -muted, not -subtle: this is real text and must stay AA (subtle is decorative-glyphs-only) */}
        <p className="text-[0.6875rem] text-foreground-muted">
          Levert av{' '}
          <a
            href={window.location.origin}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm font-medium text-foreground-muted underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            UpNext
          </a>
        </p>
      </footer>
    </div>
  );
}

function EmbedClassRow({
  course,
  todayKey,
  slug,
}: {
  course: PublicCourseWithDetails;
  todayKey: string;
  slug: string;
}) {
  const time = extractTime(course.time_schedule);
  // Start time over duration — the same compact stack the storefront agenda
  // and dashboard schedule use; a full range made the column twice as wide.
  const duration = course.duration && course.duration > 0 ? `${course.duration} min` : '';
  const bookability = courseBookability(course, todayKey);
  const isDisabled = bookability !== 'open';
  // Cancelled courses stay listed through the 30-day grace window, but the
  // detail fetch excludes them — a link would dead-end on an error page. Full
  // and closed courses keep working detail pages, so only cancelled rows go
  // inert.
  const isCancelled = bookability === 'cancelled';
  const price = entryPrice(course);
  const placeLabel = course.delivery_mode === 'online' ? 'Nettkurs' : course.location;

  // Link to the storefront the visitor loaded; the detail page canonicalizes to
  // the owner's slug when it differs. Absolute URL + new tab so the row escapes
  // the iframe to our app where booking happens.
  const href = `${window.location.origin}/${slug}/${course.slug}`;

  const body = (
    <>
      <span className="flex w-12 shrink-0 flex-col gap-0.5 @md:w-14">
        <span className="text-sm font-medium leading-5 tabular-nums text-foreground">
          {time || '—'}
        </span>
        {duration && (
          <span className="text-[0.8125rem] leading-5 text-foreground">{duration}</span>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-medium leading-5 text-foreground">
          {course.title}
        </h4>
        {/* Full text-foreground, not -muted: the row sits on a tinted fill,
            and muted ink on a filled container drops below AA (same rule as
            the get-started StepCard). Hierarchy comes from size + weight. */}
        {(course.instructor_name || placeLabel) && (
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.8125rem] text-foreground">
            {course.instructor_name && (
              <span className="truncate">{course.instructor_name}</span>
            )}
            {placeLabel && (
              <span className="truncate max-w-56">{placeLabel}</span>
            )}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-sm font-medium leading-5 tabular-nums whitespace-nowrap text-foreground">
          {price.from && price.amount
            ? <><span className="font-normal">fra </span>{formatKroner(price.amount)}</>
            : formatCoursePrice(price.amount)}
        </span>
        {/* The whole card is the link; a state label appears only when the
            course can't be booked. */}
        {isDisabled && (
          <span className="text-[0.8125rem] leading-5 text-foreground">
            {BOOKABILITY_LABELS[bookability]}
          </span>
        )}
      </div>
    </>
  );

  return (
    <li>
      {isCancelled ? (
        // Inert row — same dimmed treatment as the storefront agenda's
        // cancelled rows; the «Avlyst» label carries the state.
        <div className="flex items-start gap-3 rounded-xl bg-hover p-4 opacity-55 @md:gap-4">
          {body}
        </div>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'group flex items-start gap-3 rounded-xl p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background @md:gap-4',
            // Azure = bookable, matching the calendar's availability tint
            // (same rest/hover pair as the day circles); full and closed
            // rows stay on the neutral fill so the tint keeps its meaning.
            isDisabled
              ? 'bg-hover hover:bg-pressed'
              : 'bg-primary-subtle hover:bg-primary-border',
          )}
        >
          {body}
        </a>
      )}
    </li>
  );
}
