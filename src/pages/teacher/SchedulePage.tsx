import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays } from '@/lib/icons';
import { pageVariants, pageTransition } from '@/lib/motion';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { useTeacherShell } from '@/components/teacher/TeacherShellContext';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Card } from '@/components/ui/card';
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
import { routes } from '@/lib/routes';

// ---------------------------------------------------------------------------
// Vertical session list — replaces the prior calendar/grid view (2026-04-29).
// One card per upcoming session, grouped by date with day-support labels
// ("I dag", "I morgen", weekday). Course filter + date-range filter on top.
// ---------------------------------------------------------------------------

type RangeFilter = '7' | '30' | 'all';

interface SessionRow {
  id: string;
  courseId: string;
  sessionDate: string;       // YYYY-MM-DD
  startTime: string;         // HH:MM[:SS]
  endTime: string | null;    // HH:MM[:SS]
  courseTitle: string;
  courseLocation: string | null;
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
    course_type: string;
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

function formatDayLabel(dateStr: string): string {
  const today = todayKey();
  const diff = daysBetween(today, dateStr);
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = WEEKDAY_NB[d.getDay()];
  const dayNum = d.getDate();
  const month = MONTH_NB[d.getMonth()];

  if (diff === 0) return `I dag · ${weekday} ${dayNum}. ${month}`;
  if (diff === 1) return `I morgen · ${weekday} ${dayNum}. ${month}`;
  if (diff > 1 && diff < 7) return `${weekday} ${dayNum}. ${month}`;
  return `${weekday} ${dayNum}. ${month}`;
}

function formatTimeRange(start: string, end: string | null): string {
  const s = start.slice(0, 5);
  if (!end) return s;
  return `${s} – ${end.slice(0, 5)}`;
}

const SchedulePage = () => {
  const { currentSeller } = useAuth();
  const { setBreadcrumbs } = useTeacherShell();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('30');

  useEffect(() => {
    setBreadcrumbs([{ label: 'Hjem', to: routes.dashboard }, { label: 'Timeplan' }]);
    return () => setBreadcrumbs(null);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (!currentSeller?.id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const today = todayKey();
    const upperBound = (() => {
      if (rangeFilter === 'all') return null;
      const days = rangeFilter === '7' ? 7 : 30;
      const d = new Date();
      d.setDate(d.getDate() + days);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    })();

    (async () => {
      let query = supabase
        .from('course_sessions')
        .select(
          'id, course_id, session_date, start_time, end_time, course:courses!inner(id, title, location, course_type, max_participants)',
        )
        .eq('course.seller_id', currentSeller.id)
        .neq('course.status', 'cancelled')
        .neq('status', 'cancelled')
        .gte('session_date', today)
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (upperBound) query = query.lte('session_date', upperBound);

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

  const courseOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of sessions) {
      if (!seen.has(s.courseId)) seen.set(s.courseId, s.courseTitle);
    }
    return Array.from(seen.entries()).map(([id, title]) => ({ id, title }));
  }, [sessions]);

  const filtered = useMemo(() => {
    if (courseFilter === 'all') return sessions;
    return sessions.filter((s) => s.courseId === courseFilter);
  }, [sessions, courseFilter]);

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
        className="px-6 pb-24 md:pb-8 lg:px-8"
      >
        <div className="mb-8 pt-6 lg:pt-8">
          <h1 className="text-3xl font-semibold text-foreground">Timeplan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kommende timer sortert etter dato.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Select value={rangeFilter} onValueChange={(v) => setRangeFilter(v as RangeFilter)}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Neste 7 dager</SelectItem>
              <SelectItem value="30">Neste 30 dager</SelectItem>
              <SelectItem value="all">Alle kommende</SelectItem>
            </SelectContent>
          </Select>

          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="h-9 w-56">
              <SelectValue placeholder="Alle kurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle kurs</SelectItem>
              {courseOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.title}
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
            icon={CalendarDays}
            title="Ingen kommende timer"
            description={
              courseFilter !== 'all'
                ? 'Prøv et annet kurs eller endre tidsperiode.'
                : 'Opprett et kurs for å fylle timeplanen.'
            }
            className="py-16"
          />
        ) : (
          <div className="space-y-8">
            {groups.map(([date, daySessions]) => (
              <section key={date} aria-labelledby={`day-${date}`}>
                <h2
                  id={`day-${date}`}
                  className="mb-3 text-sm font-medium tracking-tight text-foreground"
                >
                  {formatDayLabel(date)}
                </h2>
                <div className="space-y-2">
                  {daySessions.map((s) => (
                    <SessionCard key={s.id} session={s} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </motion.div>
    </main>
  );
};

function SessionCard({ session }: { session: SessionRow }) {
  const meta = [session.courseLocation].filter(Boolean).join(' · ');
  const capacityText =
    session.maxParticipants != null
      ? `${session.signupCount} / ${session.maxParticipants} påmeldt`
      : `${session.signupCount} påmeldt`;

  return (
    <Card className="gap-0 p-0 hover:bg-muted/40 transition-colors">
      <Link
        to={routes.course(session.courseId)}
        className={cn(
          'block px-4 py-3.5 outline-none rounded-lg',
          'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50',
        )}
      >
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-medium tabular-nums text-foreground shrink-0 min-w-[6.5rem]">
            {formatTimeRange(session.startTime, session.endTime)}
          </span>
          <span className="text-sm font-medium text-foreground truncate">
            {session.courseTitle}
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-3 pl-[6.5rem]">
          <span className="text-xs text-muted-foreground tabular-nums truncate">
            {meta && (
              <>
                <span>{meta}</span>
                <span className="text-disabled-foreground mx-1.5">·</span>
              </>
            )}
            <span>{capacityText}</span>
          </span>
        </div>
      </Link>
    </Card>
  );
}

export default SchedulePage;
