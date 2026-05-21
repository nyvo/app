import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Users } from '@/lib/icons';
import { pageVariants, pageTransition } from '@/lib/motion';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
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
import type { CourseFormat, DeliveryMode } from '@/types/database';

// ---------------------------------------------------------------------------
// Vertical session list — replaces the prior calendar/grid view (2026-04-29).
// One card per upcoming session, grouped by date with day-support labels
// ("I dag", "I morgen", weekday). Course filter + date-range filter on top.
// ---------------------------------------------------------------------------

type RangeFilter = 'active' | 'past';

interface SessionRow {
  id: string;
  courseId: string;
  sessionDate: string;       // YYYY-MM-DD
  startTime: string;         // HH:MM[:SS]
  endTime: string | null;    // HH:MM[:SS]
  courseTitle: string;
  courseLocation: string | null;
  courseFormat: CourseFormat;
  deliveryMode: DeliveryMode;
  signupCount: number;
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

const WEEKDAY_NB = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
const MONTH_NB = ['januar', 'februar', 'mars', 'april', 'mai', 'juni',
                  'juli', 'august', 'september', 'oktober', 'november', 'desember'];

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
  const { currentSeller } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('active');

  useEffect(() => {
    if (!currentSeller?.id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const today = todayKey();
    const isActive = rangeFilter === 'active';

    (async () => {
      const query = supabase
        .from('course_sessions')
        .select(
          'id, course_id, session_date, start_time, end_time, course:courses!inner(id, title, location, format, delivery_mode, max_participants)',
        )
        .eq('course.seller_id', currentSeller.id)
        .neq('course.status', 'cancelled')
        .neq('status', 'cancelled')
        [isActive ? 'gte' : 'lt']('session_date', today)
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

      // Confirmed-signup counts per course (capacity is per-course on the
      // schema today — drop-ins use per-session capacity but we keep the
      // simpler course-level count here for display).
      const counts: Record<string, number> = {};
      if (courseIds.length > 0) {
        const { data: countRows } = await supabase
          .from('signups')
          .select('course_id')
          .in('course_id', courseIds)
          .eq('status', 'confirmed');
        for (const r of (countRows ?? []) as Array<{ course_id: string }>) {
          counts[r.course_id] = (counts[r.course_id] ?? 0) + 1;
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
          signupCount: counts[r.course_id] ?? 0,
          maxParticipants: r.course!.max_participants,
        }));

      setSessions(enriched);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentSeller?.id, rangeFilter]);

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

  return (
    <main className="flex-1 min-h-full overflow-y-auto bg-background">
      <MobileTeacherHeader title="Timeplan" />

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        transition={pageTransition}
        className="mx-auto w-full max-w-7xl px-6 pb-24 md:pb-8 lg:px-8"
      >
        <div className="mb-12 pt-6 lg:pt-12">
          <h1 className="text-2xl font-medium tracking-tight text-foreground">Timeplan</h1>
        </div>

        {/* Underline tabs — active vs past. Course filter as a secondary lens. */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border">
          <nav role="tablist" aria-label="Status" className="flex gap-6">
            {(['active', 'past'] as const).map((key) => {
              const label = key === 'active' ? 'Aktive' : 'Fullførte';
              const isActive = rangeFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setRangeFilter(key)}
                  className={cn(
                    'inline-flex items-center py-3 text-base border-b-2 transition-colors duration-150 outline-none focus-visible:text-foreground',
                    isActive
                      ? 'font-medium border-foreground text-foreground'
                      : 'border-transparent text-foreground-muted hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="h-9 w-48 mb-2">
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

        {/* Body */}
        {loading ? (
          <div className="space-y-4" role="status" aria-label="Laster">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="Noe gikk galt"
            message={error}
            onRetry={() => setRangeFilter((r) => r)}
          />
        ) : groups.length === 0 ? (
          <EmptyState
            title={rangeFilter === 'active' ? 'Ingen kommende timer' : 'Ingen fullførte timer ennå'}
            description={
              monthFilter !== 'all'
                ? 'Prøv en annen måned.'
                : rangeFilter === 'active'
                  ? 'Opprett et kurs for å fylle timeplanen.'
                  : 'Tidligere økter dukker opp her etter de er ferdige.'
            }
            className="py-16"
          />
        ) : (
          <div className="space-y-8">
            {groups.map(([date, daySessions]) => {
              const label = formatDayLabel(date);
              return (
                <section key={date} aria-labelledby={`day-${date}`}>
                  <h2
                    id={`day-${date}`}
                    className="mb-3 flex items-baseline gap-2"
                  >
                    <span className="text-lg font-medium text-foreground">{label.primary}</span>
                    <span className="text-base text-foreground-muted">{label.secondary}</span>
                  </h2>
                  <div className="space-y-2">
                    {daySessions.map((s) => (
                      <SessionCard key={s.id} session={s} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </motion.div>
    </main>
  );
};

function SessionCard({ session }: { session: SessionRow }) {
  const isFull =
    session.maxParticipants != null && session.signupCount >= session.maxParticipants;
  const capacityText =
    session.maxParticipants != null
      ? isFull
        ? 'Fullt'
        : `${session.signupCount} / ${session.maxParticipants}`
      : `${session.signupCount}`;

  return (
    <Link
      to={{ search: `?kurs=${session.courseId}&sess=${session.id}&from=schedule` }}
      className={cn(
        'block rounded-lg bg-muted p-4 outline-none transition-shadow ring-1 ring-transparent',
        'hover:ring-border',
        'focus-visible:ring-2 focus-visible:ring-ring/50',
      )}
    >
      <p className="text-base font-medium text-foreground truncate">
        {session.courseTitle}
      </p>

      <div className="mt-1 flex items-center gap-4 text-base text-foreground-muted tabular-nums">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-4 shrink-0" aria-hidden="true" />
          {formatTimeRange(session.startTime, session.endTime)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-4 shrink-0" aria-hidden="true" />
          {capacityText}
        </span>
      </div>
    </Link>
  );
}

export default SchedulePage;
