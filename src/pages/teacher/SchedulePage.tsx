import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Monitor, Users } from '@/lib/icons';
import { PageShell } from '@/components/teacher/PageShell';
import { TimelineEntry } from '@/components/teacher/TimelineEntry';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { DelayedFallback } from '@/components/ui/delayed-fallback';
import { PageTabs, PageTab } from '@/components/ui/page-tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { MONTHS_LONG } from '@/lib/calendar-nb';
import type { CourseFormat, DeliveryMode } from '@/types/database';

// ---------------------------------------------------------------------------
// Vertical session list — replaces the prior calendar/grid view (2026-04-29).
// One card per upcoming session, grouped by date with day-support labels
// ("I dag", "I morgen", weekday). Course filter + date-range filter on top.
// ---------------------------------------------------------------------------

type RangeFilter = 'active' | 'past';

export interface SessionRow {
  id: string;
  courseId: string;
  sessionDate: string;       // YYYY-MM-DD
  startTime: string;         // HH:MM[:SS]
  endTime: string | null;    // HH:MM[:SS]
  courseTitle: string;
  courseLocation: string | null;
  courseFormat: CourseFormat;
  deliveryMode: DeliveryMode;
  // null = counts RPC failed; render `–`, never a fabricated 0.
  signupCount: number | null;
  maxParticipants: number | null;
}

// Joined row shape from the embedded course query.
interface SessionWithCourse {
  id: string;
  course_id: string;
  session_date: string;
  start_time: string;
  end_time: string | null;
  course: {
    id: string;
    title: string;
    location: string | null;
    format: CourseFormat;
    delivery_mode: DeliveryMode;
    max_participants: number | null;
  } | null;
}

// Title Case, Sunday-first — deliberately NOT the canonical lowercase
// WEEKDAYS_LONG (@/lib/calendar-nb); this page's grammar capitalizes the
// whole weekday, not just the first letter, so the values differ.
const WEEKDAY_NB = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
const MONTH_NB = MONTHS_LONG;

/** Local YYYY-MM-DD for "today" (no UTC drift). */
function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Days between two YYYY-MM-DD strings (positive = b is later). */
function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDayLabel(dateStr: string): { primary: string; secondary: string } {
  const today = todayKey();
  const diff = daysBetween(today, dateStr);
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = WEEKDAY_NB[d.getDay()];
  const dayNum = d.getDate();
  const month = MONTH_NB[d.getMonth()];
  const dateText = `${dayNum}. ${month}`;

  if (diff === 0) return { primary: 'I dag', secondary: dateText };
  if (diff === 1) return { primary: 'I morgen', secondary: dateText };
  return { primary: weekday, secondary: dateText };
}

function formatTimeRange(start: string, end: string | null): string {
  const s = start.slice(0, 5);
  if (!end) return s;
  return `${s}–${end.slice(0, 5)}`;
}

const SchedulePage = () => {
  const { currentSeller, isInitialized } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('active');
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (!currentSeller?.id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const today = todayKey();
    const isActive = rangeFilter === 'active';

    (async () => {
      const base = supabase
        .from('course_sessions')
        .select(
          'id, course_id, session_date, start_time, end_time, course:courses!inner(id, title, location, format, delivery_mode, max_participants)',
        )
        .eq('course.seller_id', currentSeller.id)
        .neq('course.status', 'cancelled')
        .neq('status', 'cancelled');
      const query = (isActive ? base.gte('session_date', today) : base.lt('session_date', today))
        .order('session_date', { ascending: isActive })
        .order('start_time', { ascending: isActive });

      const { data, error: fetchError } = await query;
      if (cancelled) return;
      if (fetchError) {
        setError('Kunne ikke laste timeplanen.');
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as unknown as SessionWithCourse[];
      const courseIds = [...new Set(rows.map((r) => r.course_id))];

      // Confirmed signup count per course (capacity is per-course on the schema
      // today; drop-ins use per-session capacity but we keep the simpler
      // course-level count here for display). Aggregated server-side — fetching
      // rows to count in JS silently truncates at PostgREST's 1000-row cap.
      const counts: Record<string, number> = {};
      let countsFailed = false;
      if (courseIds.length > 0) {
        const { data: countRows, error: countsError } = await supabase.rpc('public_signup_counts', {
          p_course_ids: courseIds,
        });
        // Guard against a stale write after the effect re-ran (tab/seller change).
        if (cancelled) return;
        if (countsError) {
          countsFailed = true;
        } else {
          for (const r of countRows ?? []) {
            counts[r.course_id] = r.confirmed_count;
          }
        }
      }

      const enriched: SessionRow[] = rows
        .filter((r) => r.course !== null)
        .map((r) => ({
          id: r.id,
          courseId: r.course_id,
          sessionDate: r.session_date,
          startTime: r.start_time,
          endTime: r.end_time,
          courseTitle: r.course!.title,
          courseLocation: r.course!.location,
          courseFormat: r.course!.format,
          deliveryMode: r.course!.delivery_mode,
          // `null` when counts couldn't load — SessionCard renders `–`.
          signupCount: countsFailed ? null : (counts[r.course_id] ?? 0),
          maxParticipants: r.course!.max_participants,
        }));

      setSessions(enriched);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentSeller?.id, rangeFilter, reloadNonce]);

  // Distinct YYYY-MM keys present in the loaded data, in display order.
  // For active tab: chronological ascending. For past: descending.
  // Year is appended only when the option is outside the current year —
  // mirrors how Apple/Google Calendar render month pickers ("Mai" stays
  // bare, "Mai 2027" gets the year suffix to disambiguate).
  const monthOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const s of sessions) {
      const key = s.sessionDate.slice(0, 7); // YYYY-MM
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push(key);
      }
    }
    return ordered.map((key) => {
      const [y, m] = key.split('-');
      const monthName = MONTH_NB[Number(m) - 1];
      const capitalized = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)}`;
      const label = Number(y) === currentYear ? capitalized : `${capitalized} ${y}`;
      return { key, label };
    });
  }, [sessions]);

  // Reset month filter when the underlying month set changes (e.g. tab switch
  // moves between past/upcoming) so we never end up with a stale selection.
  useEffect(() => {
    if (monthFilter !== 'all' && !monthOptions.some((o) => o.key === monthFilter)) {
      setMonthFilter('all');
    }
  }, [monthOptions, monthFilter]);

  const filtered = useMemo(() => {
    if (monthFilter === 'all') return sessions;
    return sessions.filter((s) => s.sessionDate.startsWith(monthFilter));
  }, [sessions, monthFilter]);

  // Group by sessionDate. Sessions are already date-sorted by the query.
  const groups = useMemo(() => {
    const map = new Map<string, SessionRow[]>();
    for (const s of filtered) {
      const arr = map.get(s.sessionDate) ?? [];
      arr.push(s);
      map.set(s.sessionDate, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  // Auth settled but no active seller — a bounded account error instead of an
  // eternal skeleton (the effect returns early when there's no seller id).
  if (isInitialized && !currentSeller) {
    return (
      <PageShell title="Timeplan">
        <ErrorState title="Kunne ikke laste kontoen din" message="Last siden på nytt." />
      </PageShell>
    );
  }

  return (
    <PageShell
        title="Timeplan"
        tabs={
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border">
            <PageTabs ariaLabel="Status" className="border-b-0">
              {(['active', 'past'] as const).map((key) => (
                <PageTab
                  key={key}
                  active={rangeFilter === key}
                  onClick={() => setRangeFilter(key)}
                >
                  {key === 'active' ? 'Aktive' : 'Fullførte'}
                </PageTab>
              ))}
            </PageTabs>

            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-48 max-sm:w-auto max-sm:min-w-36 mb-2">
                <SelectValue placeholder="Alle måneder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle måneder</SelectItem>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.key} value={opt.key}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        {/* Body */}
        {loading ? (
          <DelayedFallback>
            <div role="status" aria-label="Laster…">
              {/* Mirrors the timeline anatomy: date lines left, rail gutter,
                  cards (title + one meta line) right. */}
              {[1, 2].map((i) => (
                <div key={i} className="grid grid-cols-[92px_18px_1fr] gap-x-2.5">
                  <div className="space-y-1.5 pt-3">
                    <Skeleton className="ml-auto h-4 w-14" />
                    <Skeleton className="ml-auto h-3 w-16" />
                  </div>
                  <div />
                  <div className="space-y-3 pb-6">
                    {[1, 2].map((j) => (
                      <div key={j} className="rounded-xl bg-panel px-5 py-4">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="mt-1.5 h-3.5 w-72 max-w-full" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DelayedFallback>
        ) : error ? (
          <ErrorState
            title="Noe gikk galt"
            message={error}
            onRetry={() => setReloadNonce((value) => value + 1)}
          />
        ) : groups.length === 0 ? (
          <EmptyState
            title={rangeFilter === 'active' ? 'Ingen kommende timer' : 'Ingen fullførte timer ennå'}
            description={
              monthFilter !== 'all'
                ? 'Prøv en annen måned.'
                : rangeFilter === 'active'
                  ? 'Opprett et kurs for å fylle timeplanen.'
                  : 'Tidligere timer dukker opp her når de er ferdige.'
            }
          />
        ) : (
          <div>
            {groups.map(([date, daySessions], idx) => {
              const label = formatDayLabel(date);
              return (
                <TimelineDay
                  key={date}
                  primary={label.primary}
                  secondary={label.secondary}
                  rail={groups.length > 1}
                  // Azure marks the day of the actual next session — sessions
                  // are date-ascending on the active tab, so it's the first
                  // loaded row (a month filter can hide it; then no azure).
                  next={rangeFilter === 'active' && date === sessions[0]?.sessionDate}
                  lineAbove={idx > 0}
                  lineBelow={idx < groups.length - 1}
                  isLast={idx === groups.length - 1}
                >
                  {daySessions.map((s) => (
                    <SessionCard key={s.id} session={s} />
                  ))}
                </TimelineDay>
              );
            })}
          </div>
        )}
      </PageShell>
  );
};

/**
 * One day group on the shared timeline grammar (TimelineEntry — the same
 * rail as the course Kursplan feed): day + date labels left, dot + hairline
 * rail, the day's cards in the right column. Exported so the
 * /dev/schedule-preview sign-off surface renders the real component.
 */
export function TimelineDay({
  primary,
  secondary,
  rail = true,
  next = false,
  lineAbove = false,
  lineBelow = false,
  isLast = false,
  children,
}: {
  primary: string;
  secondary: string;
  /** A lone day group needs no timeline — the rail only earns its place
   *  between groups. The grid stays, so labels/cards never shift x. */
  rail?: boolean;
  /** Azure dot — the day of the next upcoming session. */
  next?: boolean;
  lineAbove?: boolean;
  lineBelow?: boolean;
  isLast?: boolean;
  children: ReactNode;
}) {
  return (
    <TimelineEntry
      // Wider date column than the Kursplan feed — "22. september" must fit.
      className="grid-cols-[92px_18px_1fr]"
      rail={rail}
      next={next}
      lineAbove={lineAbove}
      lineBelow={lineBelow}
      isLast={isLast}
      // Deeper padding between day groups (vs pb-3 between feed rows) — the
      // rail runs through it, so the spine stays continuous across the gap.
      contentClassName={!isLast ? 'pb-6' : undefined}
      date={
        <>
          <p className="text-sm font-medium leading-tight text-foreground">{primary}</p>
          <p className="mt-0.5 text-xs text-foreground-muted">{secondary}</p>
        </>
      }
    >
      <div className="space-y-3">{children}</div>
    </TimelineEntry>

  );
}

/**
 * Agenda card — title, then ONE icon-anchored meta line (time, place,
 * participants — the Time2Book schedule grammar). Every meta item shares the
 * same muted style; a full class reads "12 / 12", no badge, so the line stays
 * consistent. Exported for the /dev/schedule-preview sign-off surface.
 */
export function SessionCard({ session }: { session: SessionRow }) {
  const isOnline = session.deliveryMode === 'online';
  const placeLabel = isOnline ? 'Nettkurs' : session.courseLocation;
  const countLabel =
    session.signupCount == null
      ? '–'
      : session.maxParticipants != null
        ? `${session.signupCount} / ${session.maxParticipants}`
        : `${session.signupCount}`;

  return (
    <Link
      to={{ search: `?kurs=${session.courseId}&sess=${session.id}&from=schedule` }}
      className={cn(
        'block rounded-xl bg-panel px-5 py-4 outline-none transition-colors duration-150 hover:bg-hover',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
      )}
    >
      <p className="truncate text-base font-medium text-foreground">
        {session.courseTitle}
      </p>

      <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="tabular-nums">
            {formatTimeRange(session.startTime, session.endTime)}
          </span>
        </span>
        {placeLabel && (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            {isOnline ? (
              <Monitor className="size-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">{placeLabel}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="tabular-nums">{countLabel}</span>
        </span>
      </p>
    </Link>
  );
}

export default SchedulePage;
