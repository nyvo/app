import { useState, useMemo, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { motion } from 'framer-motion';
import { ArrowUpDown, Calendar } from '@/lib/icons';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { pageVariants, pageTransition } from '@/lib/motion';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { CoursesEmptyState } from '@/components/teacher/CoursesEmptyState';
import { CourseListView, CourseListSkeleton, PastCoursesList, COURSES_PER_PAGE } from '@/components/teacher/CourseListView';
import { CoursesKpiStrip, type CoursesKpis } from '@/components/teacher/CoursesKpiStrip';
import { SearchInput } from '@/components/ui/search-input';
import { useTeacherShell } from '@/components/teacher/TeacherShellContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { EmptyStateToggle } from '@/components/ui/EmptyStateToggle';
import { useAuth } from '@/contexts/AuthContext';
import { cn, getShowEmptyState } from '@/lib/utils';
import { fetchCourses } from '@/services/courses';
import type { SessionScheduleRow } from '@/services/courses';
import type { Course, CourseType } from '@/types/database';
import { typedFrom } from '@/lib/supabase';

/**
 * Maps a Course to a SessionScheduleRow shape for display in the table.
 */
function mapCourseToRow(
  course: Course,
  signupsCount: number,
  nextSessionDate: string | undefined,
  allowsDropIn: boolean,
): SessionScheduleRow {
  const timeMatch = course.time_schedule?.match(/(\d{2}:\d{2})/);
  const startTime = timeMatch ? timeMatch[1] : '';

  let endTime = '';
  if (startTime && course.duration) {
    const [h, m] = startTime.split(':').map(Number);
    const totalMin = h * 60 + m + course.duration;
    endTime = `${Math.floor(totalMin / 60).toString().padStart(2, '0')}:${(totalMin % 60).toString().padStart(2, '0')}`;
  }
  if (!endTime) {
    const endMatch = course.time_schedule?.match(/\d{2}:\d{2}-(\d{2}:\d{2})/);
    if (endMatch) endTime = endMatch[1];
  }

  return {
    sessionId: course.id,
    courseId: course.id,
    courseTitle: course.title,
    courseType: course.course_type as CourseType,
    sessionDate: nextSessionDate || course.start_date || (course.created_at || '').slice(0, 10),
    startTime,
    endTime,
    location: course.location || '',
    price: course.price,
    signupsCount,
    maxParticipants: course.max_participants,
    courseStatus: course.status,
    courseStartDate: course.start_date,
    courseEndDate: course.end_date,
    totalWeeks: course.total_weeks,
    timeSchedule: course.time_schedule || null,
    imageUrl: course.image_url || null,
    allowsDropIn,
  };
}

type ViewTab = 'active' | 'past' | 'draft';
type SortKey = 'next' | 'name' | 'signups' | 'updated';

/**
 * Inline segmented control — muted track with each option as a pill.
 * The active pill flips to bg-background + a soft shadow so it reads as
 * "lifted out of the track". Inline counts use tabular nums.
 */
function SegmentedTabs({
  value,
  onChange,
  draftCount,
}: {
  value: ViewTab;
  onChange: (v: ViewTab) => void;
  draftCount: number;
}) {
  const tabs: { key: ViewTab; label: string; count?: number }[] = [
    { key: 'active', label: 'Aktive' },
    { key: 'past', label: 'Fullførte' },
    { key: 'draft', label: 'Utkast', count: draftCount > 0 ? draftCount : undefined },
  ];
  return (
    <div role="tablist" aria-label="Filtrer kurs" className="inline-flex rounded-lg bg-muted p-0.5 gap-0.5 w-fit">
      {tabs.map(t => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              active
                ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                : 'text-foreground-muted hover:text-foreground',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn(
                'tabular-nums text-xs',
                active ? 'text-foreground' : 'text-foreground-muted',
              )}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Default sort per tab — matches the most useful order for each view.
const DEFAULT_SORT_FOR_TAB: Record<ViewTab, SortKey> = {
  active: 'next',
  past: 'updated',
  draft: 'updated',
};

const CoursesPage = () => {
  const showEmptyState = getShowEmptyState();
  const { currentSeller } = useAuth();
  const { setAction } = useTeacherShell();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewTab, setViewTab] = useState<ViewTab>('active');
  const [sortKey, setSortKey] = useState<SortKey>('next');
  const [visibleCount, setVisibleCount] = useState(COURSES_PER_PAGE);
  const [courses, setCourses] = useState<Course[]>([]);
  const [signupsCounts, setSignupsCounts] = useState<Record<string, number>>({});
  const [nextSessionDates, setNextSessionDates] = useState<Record<string, string>>({});
  // Course IDs that have at least one ACTIVE drop-in ticket type. Replaces
  // the dropped courses.allows_drop_in column.
  const [dropInCourseIds, setDropInCourseIds] = useState<Set<string>>(() => new Set());
  const [kpis, setKpis] = useState<CoursesKpis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentSeller?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const coursesResult = await fetchCourses(currentSeller.id);

      if (coursesResult.error) {
        setError('Kunne ikke hente kurs. Sjekk nettforbindelsen og prøv på nytt.');
        return;
      }

      const coursesData = coursesResult.data || [];
      setCourses(coursesData);

      const courseIds = coursesData.map(c => c.id);

      if (courseIds.length > 0) {
        const { data: signupsData, error: signupsError } = await typedFrom('signups')
          .select('course_id, created_at, amount_paid')
          .in('course_id', courseIds)
          .eq('status', 'confirmed');

        if (signupsError) {
          logger.error('Failed to fetch signups counts:', signupsError);
        }

        type SignupRow = { course_id: string; created_at: string | null; amount_paid: number | null };
        const signupRows = (signupsData as SignupRow[] | null) ?? [];

        const counts: Record<string, number> = {};
        signupRows.forEach(s => {
          counts[s.course_id] = (counts[s.course_id] || 0) + 1;
        });
        setSignupsCounts(counts);

        const today = new Date().toISOString().split('T')[0];
        const { data: sessionsData } = await typedFrom('course_sessions')
          .select('course_id, session_date')
          .in('course_id', courseIds)
          .gte('session_date', today)
          .order('session_date', { ascending: true });

        const nextDates: Record<string, string> = {};
        (sessionsData as { course_id: string; session_date: string }[] | null)?.forEach(s => {
          if (!nextDates[s.course_id]) {
            nextDates[s.course_id] = s.session_date;
          }
        });
        setNextSessionDates(nextDates);

        // Drop-in availability lives on tier rows now. A course "allows drop-in"
        // iff it has at least one active drop-in ticket type.
        const { data: dropInTiers } = await typedFrom('course_signup_packages')
          .select('course_id')
          .in('course_id', courseIds)
          .eq('ticket_kind', 'drop_in')
          .eq('is_active', true);

        const dropInIds = new Set<string>(
          (dropInTiers as { course_id: string }[] | null)?.map(t => t.course_id) ?? []
        );
        setDropInCourseIds(dropInIds);

        // ── Compute KPIs ─────────────────────────────────────────────────
        // Active courses: not draft / cancelled / completed AND not past end_date.
        const todayStr = new Date().toISOString().split('T')[0];
        const isActive = (c: Course) => {
          if (c.status === 'draft' || c.status === 'cancelled' || c.status === 'completed') return false;
          const cutoff = c.end_date || c.start_date;
          return !(cutoff != null && cutoff < todayStr);
        };
        const activeCourses = coursesData.filter(isActive);
        const activeCount = activeCourses.length;

        // Free spots: sum of (max - confirmed) for active courses with a max set.
        const freeSpots = activeCourses.reduce((sum, c) => {
          if (c.max_participants == null) return sum;
          const taken = counts[c.id] ?? 0;
          return sum + Math.max(0, c.max_participants - taken);
        }, 0);

        // This-week start (Monday 00:00 local)
        const weekStart = new Date();
        const day = weekStart.getDay(); // 0=Sun
        const diffToMonday = day === 0 ? -6 : 1 - day;
        weekStart.setDate(weekStart.getDate() + diffToMonday);
        weekStart.setHours(0, 0, 0, 0);

        // This-month start
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        let signupsThisWeek = 0;
        let monthRevenue = 0;
        for (const s of signupRows) {
          if (!s.created_at) continue;
          const t = new Date(s.created_at).getTime();
          if (Number.isNaN(t)) continue;
          if (t >= weekStart.getTime()) signupsThisWeek++;
          if (t >= monthStart.getTime()) monthRevenue += s.amount_paid ?? 0;
        }

        setKpis({
          activeCourses: activeCount,
          signupsThisWeek,
          freeSpots,
          monthRevenue,
        });
      } else {
        setKpis({ activeCourses: 0, signupsThisWeek: 0, freeSpots: 0, monthRevenue: 0 });
      }
    } catch {
      setError('Kunne ikke hente kurs. Prøv på nytt.');
    } finally {
      setIsLoading(false);
    }
  }, [currentSeller?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allRows = useMemo(() => {
    return courses.map(c => ({
      row: mapCourseToRow(c, signupsCounts[c.id] || 0, nextSessionDates[c.id], dropInCourseIds.has(c.id)),
      course: c,
    }));
  }, [courses, signupsCounts, nextSessionDates, dropInCourseIds]);

  const draftCount = useMemo(
    () => allRows.reduce((n, { course }) => n + (course.status === 'draft' ? 1 : 0), 0),
    [allRows],
  );

  const filteredRows = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const q = searchQuery.toLowerCase().trim();

    const isPast = (course: Course) => {
      const cutoff = course.end_date || course.start_date;
      return course.status === 'cancelled' || course.status === 'completed' || (cutoff != null && cutoff < today);
    };

    return allRows
      .filter(({ row, course }) => {
        if (viewTab === 'draft') {
          if (course.status !== 'draft') return false;
        } else if (viewTab === 'past') {
          if (course.status === 'draft') return false;
          if (!isPast(course)) return false;
        } else {
          if (course.status === 'draft') return false;
          if (isPast(course)) return false;
        }

        if (q && !row.courseTitle.toLowerCase().includes(q) && !row.location.toLowerCase().includes(q)) return false;

        return true;
      })
      .sort((a, b) => {
        switch (sortKey) {
          case 'next':
            return a.row.sessionDate.localeCompare(b.row.sessionDate);
          case 'name':
            return a.row.courseTitle.localeCompare(b.row.courseTitle, 'nb');
          case 'signups':
            return b.row.signupsCount - a.row.signupsCount;
          case 'updated': {
            const au = a.course.updated_at || a.course.created_at || '';
            const bu = b.course.updated_at || b.course.created_at || '';
            return bu.localeCompare(au);
          }
        }
      })
      .map(({ row }) => row);
  }, [allRows, viewTab, searchQuery, sortKey]);

  const showCoursesEmptyState = showEmptyState || (!isLoading && courses.length === 0 && !error);

  useEffect(() => {
    setVisibleCount(COURSES_PER_PAGE);
  }, [viewTab, searchQuery, sortKey]);

  // When the user switches tab, reset sort to that tab's most useful default.
  useEffect(() => {
    setSortKey(DEFAULT_SORT_FOR_TAB[viewTab]);
  }, [viewTab]);

  const visibleRows = filteredRows.slice(0, visibleCount);
  const hasMoreRows = visibleCount < filteredRows.length;
  const showLoadMore = !isLoading && !error && filteredRows.length > 0 && !(viewTab === 'past' && !searchQuery) && hasMoreRows;

  useEffect(() => {
    setAction(null);
    return () => setAction(null);
  }, [setAction]);

  const emptyTitle = searchQuery ? 'Ingen kurs funnet' : 'Ingen kurs her';
  const emptyDescription = searchQuery
    ? 'Prøv et annet søkeord eller fjern søket.'
    : viewTab === 'draft'
      ? 'Du har ingen utkast.'
      : viewTab === 'past'
        ? 'Ingen fullførte kurs ennå.'
        : 'Ingen aktive eller kommende kurs akkurat nå.';

  return (
      <div className="flex-1 flex flex-col min-h-full overflow-y-auto bg-background">

        <MobileTeacherHeader title="Mine kurs" />

        <motion.header
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
          className="shrink-0 px-6 lg:px-8 pt-6 lg:pt-8 pb-0"
        >
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-foreground">Mine kurs</h1>
            {!showCoursesEmptyState && (
              <p className="text-sm mt-1 text-foreground-muted">Oversikt over kursene dine.</p>
            )}
          </div>
        </motion.header>

        <div className="flex-1 px-6 lg:px-8 pb-6 lg:pb-8">
          {!showCoursesEmptyState && (
            <CoursesKpiStrip kpis={kpis} loading={isLoading} />
          )}
          {showCoursesEmptyState ? (
            <CoursesEmptyState />
          ) : (
            <>
              {/* Toolbar — sits OUTSIDE the frame on the page background */}
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                <SegmentedTabs
                  value={viewTab}
                  onChange={setViewTab}
                  draftCount={draftCount}
                />
                <div className="flex w-full items-center gap-2 md:ml-auto md:w-auto">
                  <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                    <SelectTrigger className="w-44" aria-label="Sorter kurs">
                      <ArrowUpDown className="size-3.5 text-foreground-muted" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="next">Neste økt</SelectItem>
                      <SelectItem value="name">Navn (A–Å)</SelectItem>
                      <SelectItem value="signups">Påmeldte (mest fullt)</SelectItem>
                      <SelectItem value="updated">Sist endret</SelectItem>
                    </SelectContent>
                  </Select>
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Søk etter kurs"
                    aria-label="Søk etter kurs"
                    className="flex-1 md:max-w-xs"
                  />
                </div>
              </div>

              {/* Frame — rows + footer in one card */}
              <div className="rounded-lg border border-border bg-surface divide-y divide-border overflow-hidden">
                {isLoading ? (
                  <div role="status" aria-live="polite" aria-label="Laster kurs">
                    <span className="sr-only">Henter kurs</span>
                    <CourseListSkeleton />
                  </div>
                ) : error ? (
                  <ErrorState
                    title="Kunne ikke hente kurs"
                    message={error}
                    onRetry={loadData}
                    variant="card"
                  />
                ) : filteredRows.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title={emptyTitle}
                    description={emptyDescription}
                    className="py-16"
                  />
                ) : viewTab === 'past' && !searchQuery ? (
                  <div className="p-3">
                    <PastCoursesList courses={filteredRows} />
                  </div>
                ) : (
                  <CourseListView courses={visibleRows} />
                )}

                {/* Footer — single row inside the frame: support text left, button right.
                    Lives BELOW the divide-y rows, separated by its own border. */}
                {showLoadMore && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-background">
                    <span className="text-xs text-foreground-muted tabular-nums">
                      Viser {visibleCount} av {filteredRows.length} kurs
                    </span>
                    <Button
                      variant="outline-soft"
                      size="sm"
                      onClick={() => setVisibleCount(prev => prev + COURSES_PER_PAGE)}
                    >
                      Vis flere
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <EmptyStateToggle />
      </div>
  );
};

export default CoursesPage;
