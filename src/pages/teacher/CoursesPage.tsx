import { useState, useMemo, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { CreateCourseDrawer } from '@/components/teacher/CreateCourseDrawer';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { pageVariants, pageTransition } from '@/lib/motion';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { CoursesEmptyState } from '@/components/teacher/CoursesEmptyState';
import { CourseListView, CourseListSkeleton, PastCoursesList, COURSES_PER_PAGE } from '@/components/teacher/CourseListView';
import { SearchInput } from '@/components/ui/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronDown } from '@/lib/icons';
import { EmptyStateToggle } from '@/components/ui/EmptyStateToggle';
import { useAuth } from '@/contexts/AuthContext';
import { cn, foldNorwegian, getShowEmptyState } from '@/lib/utils';
import { fetchCourses } from '@/services/courses';
import type { SessionScheduleRow } from '@/services/courses';
import type { Course } from '@/types/database';
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
    courseFormat: course.format,
    deliveryMode: course.delivery_mode,
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

// Default sort per tab — matches the most useful order for each view.
const DEFAULT_SORT_FOR_TAB: Record<ViewTab, SortKey> = {
  active: 'next',
  past: 'updated',
  draft: 'updated',
};

const CoursesPage = () => {
  const showEmptyState = getShowEmptyState();
  const { currentSeller } = useAuth();
  // `?new=1` opens the create drawer. The quick-glance `?kurs=:id` overlay
  // lives at the layout level (TeacherLayout) so it works on any page.
  const [searchParams, setSearchParams] = useSearchParams();
  const showCreateDrawer = searchParams.get('new') === '1';

  const handleCreateOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('new');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
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
    const q = foldNorwegian(searchQuery.trim());

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

        if (q && !foldNorwegian(row.courseTitle).includes(q) && !foldNorwegian(row.location).includes(q)) return false;

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

  const emptyTitle = 'Ingen kurs her';
  const emptyDescription = viewTab === 'draft'
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
          className="shrink-0 mx-auto w-full max-w-6xl px-6 lg:px-8 pt-6 lg:pt-12 pb-0"
        >
          <div className="mb-12 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mine kurs</h1>
            </div>
            {!showCoursesEmptyState && (
              <Button
                size="sm"
                className="shrink-0"
                onClick={() =>
                  setSearchParams(
                    (prev) => {
                      const next = new URLSearchParams(prev);
                      next.set('new', '1');
                      return next;
                    },
                    { replace: false },
                  )
                }
              >
                Opprett kurs
              </Button>
            )}
          </div>
        </motion.header>

        <div className="flex-1 mx-auto w-full max-w-6xl px-6 lg:px-8 pb-6 lg:pb-8">
          {showCoursesEmptyState ? (
            <CoursesEmptyState />
          ) : (
            <>
              {/* Toolbar — underline tabs (matches Timeplan), sort + search inline */}
              <div className="mb-5 flex flex-col gap-3 border-b border-border md:flex-row md:items-end md:justify-between">
                <nav role="tablist" aria-label="Filtrer kurs" className="flex gap-6">
                  {(['active', 'past', 'draft'] as const).map((key) => {
                    const label = key === 'active' ? 'Aktive' : key === 'past' ? 'Fullførte' : 'Utkast';
                    const count = key === 'draft' && draftCount > 0 ? draftCount : null;
                    const isActive = viewTab === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setViewTab(key)}
                        className={cn(
                          'inline-flex items-center gap-2 py-3 text-sm border-b-2 transition-colors duration-150 outline-none focus-visible:text-foreground',
                          isActive
                            ? 'font-medium border-foreground text-foreground'
                            : 'border-transparent text-foreground-muted hover:text-foreground',
                        )}
                      >
                        {label}
                        {count != null && (
                          <span className="text-xs tabular-nums text-foreground-muted">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
                <div className="flex w-full items-center gap-2 pb-2 md:w-auto">
                  <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                    <SelectTrigger className="h-9 w-44" aria-label="Sorter kurs">
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
                    placeholder="Søk etter kurs…"
                    aria-label="Søk etter kurs"
                    className="flex-1 md:max-w-xs"
                  />
                </div>
              </div>

              {/* List — each card is its own bordered surface; no outer frame */}
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
                />
              ) : filteredRows.length === 0 ? (
                searchQuery ? (
                  <EmptyState
                    title={`Ingen kurs matcher «${searchQuery}»`}
                    description="Prøv et annet søkeord."
                    action={
                      <Button variant="outline-soft" size="sm" onClick={() => setSearchQuery('')}>
                        Tøm søk
                      </Button>
                    }
                    className="py-16"
                  />
                ) : (
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    className="py-16"
                  />
                )
              ) : viewTab === 'past' && !searchQuery ? (
                <PastCoursesList courses={filteredRows} />
              ) : (
                <CourseListView courses={visibleRows} />
              )}

              {showLoadMore && (
                <div className="mt-4 grid grid-cols-3 items-center">
                  <span className="text-xs text-foreground-muted tabular-nums">
                    Viser {visibleCount} av {filteredRows.length} kurs
                  </span>
                  <div className="flex justify-center">
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label={`Vis flere kurs (${filteredRows.length - visibleCount} igjen)`}
                      title="Vis flere"
                      onClick={() => setVisibleCount(prev => prev + COURSES_PER_PAGE)}
                    >
                      <ChevronDown />
                    </Button>
                  </div>
                  <div aria-hidden="true" />
                </div>
              )}
            </>
          )}
        </div>
        <EmptyStateToggle />

        <CreateCourseDrawer
          open={showCreateDrawer}
          onOpenChange={handleCreateOpenChange}
        />
      </div>
  );
};

export default CoursesPage;
