import { useState, useMemo, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useSearchParams } from 'react-router-dom';
import { CreateCourseDrawer } from '@/components/teacher/CreateCourseDrawer';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { PageShell } from '@/components/teacher/PageShell';
import { CoursesEmptyState } from '@/components/teacher/CoursesEmptyState';
import { CourseListView, CourseListSkeleton, type SortKey, type SortDir } from '@/components/teacher/CourseListView';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { PageTabs, PageTab } from '@/components/ui/page-tabs';
import { CalendarPlus } from '@/lib/icons';
import { useAuth } from '@/contexts/AuthContext';
import { foldNorwegian } from '@/lib/utils';
import { fetchCourses } from '@/services/courses';
import type { SessionScheduleRow } from '@/services/courses';
import type { Course } from '@/types/database';
import { deriveCourseDisplayStatus } from '@/lib/course-status';
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
    // Display lifecycle for the list badge (so ended courses read "Fullført").
    // Sessions aren't loaded per row here, so this falls back to course dates.
    // Persisted `course.status` still drives the active/past tab filter below.
    courseStatus: deriveCourseDisplayStatus({
      status: course.status,
      startDate: course.start_date,
      endDate: course.end_date,
    }),
    courseStartDate: course.start_date,
    courseEndDate: course.end_date,
    totalWeeks: course.total_weeks,
    timeSchedule: course.time_schedule || null,
    imageUrl: course.image_url || null,
    allowsDropIn,
  };
}

type ViewTab = 'active' | 'past';

// Default sort key + direction per tab — picked for what's most scannable.
// Active: next session ascending (soonest first). Past: next session descending
// (most recently ended first).
const DEFAULT_SORT_FOR_TAB: Record<ViewTab, { key: SortKey; dir: SortDir }> = {
  active: { key: 'next', dir: 'asc' },
  past: { key: 'next', dir: 'desc' },
};

const CoursesPage = () => {
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
  const [sortDir, setSortDir] = useState<SortDir>('asc');
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
        setError('Kunne ikke hente kurs. Sjekk nettet og prøv igjen.');
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
      setError('Kunne ikke hente kurs. Prøv igjen.');
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

  const filteredRows = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const q = foldNorwegian(searchQuery.trim());

    const isPast = (course: Course) => {
      const cutoff = course.end_date || course.start_date;
      return course.status === 'cancelled' || course.status === 'completed' || (cutoff != null && cutoff < today);
    };

    return allRows
      .filter(({ row, course }) => {
        // Drafts no longer have their own tab — they live in Active and are
        // distinguished by the Status column ("Utkast" vs "Synlig").
        if (viewTab === 'past') {
          if (course.status === 'draft') return false;
          if (!isPast(course)) return false;
        } else {
          if (isPast(course)) return false;
        }

        if (q && !foldNorwegian(row.courseTitle).includes(q) && !foldNorwegian(row.location).includes(q)) return false;

        return true;
      })
      .sort((a, b) => {
        let result = 0;
        switch (sortKey) {
          case 'next':
            result = a.row.sessionDate.localeCompare(b.row.sessionDate);
            break;
          case 'name':
            result = a.row.courseTitle.localeCompare(b.row.courseTitle, 'nb');
            break;
          case 'signups':
            result = a.row.signupsCount - b.row.signupsCount;
            break;
          case 'price':
            result = (a.row.price ?? 0) - (b.row.price ?? 0);
            break;
        }
        return sortDir === 'asc' ? result : -result;
      })
      .map(({ row, course }) => {
        // On the Past tab, the date column reads as a "last session" date.
        // Swap to the course's end date so the value matches the header.
        if (viewTab === 'past') {
          const end = course.end_date || course.start_date || row.sessionDate;
          return { ...row, sessionDate: end };
        }
        return row;
      });
  }, [allRows, viewTab, searchQuery, sortKey, sortDir]);

  const showCoursesEmptyState = !isLoading && courses.length === 0 && !error;

  // When the user switches tab, reset sort to that tab's most useful default.
  useEffect(() => {
    const { key, dir } = DEFAULT_SORT_FOR_TAB[viewTab];
    setSortKey(key);
    setSortDir(dir);
  }, [viewTab]);

  // Click sortable header — same column toggles direction, new column adopts
  // its sensible default direction (asc for name/next, desc for signups/price).
  const handleSort = useCallback((key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'signups' || key === 'price' ? 'desc' : 'asc');
  }, [sortKey]);

  const visibleRows = filteredRows;

  const emptyTitle = 'Ingen kurs her';
  const emptyDescription = viewTab === 'past'
    ? 'Ingen fullførte kurs ennå.'
    : 'Ingen aktive eller kommende kurs akkurat nå.';

  return (
      <div className="flex-1 flex flex-col min-h-full overflow-y-auto bg-background">

        <MobileTeacherHeader title="Mine kurs" />

        <PageShell
          title="Mine kurs"
          action={
            !showCoursesEmptyState && (
              <Button
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
                <CalendarPlus data-icon="inline-start" />
                Opprett kurs
              </Button>
            )
          }
          tabs={
            !showCoursesEmptyState && (
              <div className="flex flex-col gap-3 border-b border-border md:flex-row md:items-end md:justify-between">
                <PageTabs ariaLabel="Filtrer kurs" className="border-b-0">
                  {(['active', 'past'] as const).map((key) => (
                    <PageTab
                      key={key}
                      active={viewTab === key}
                      onClick={() => setViewTab(key)}
                    >
                      {key === 'active' ? 'Aktive' : 'Fullførte'}
                    </PageTab>
                  ))}
                </PageTabs>
                <div className="flex w-full items-center gap-2 pb-2 md:w-auto">
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Søk etter kurs…"
                    aria-label="Søk etter kurs"
                    className="flex-1 md:max-w-xs"
                  />
                </div>
              </div>
            )
          }
        >
          {showCoursesEmptyState ? (
            <CoursesEmptyState />
          ) : (
            <>
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
              ) : (
                <CourseListView
                  courses={visibleRows}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  emptyState={
                    searchQuery ? (
                      <EmptyState
                        title={`Fant ingen kurs for «${searchQuery}»`}
                        description="Prøv et annet søkeord."
                        action={
                          <Button variant="secondary" onClick={() => setSearchQuery('')}>
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
                  }
                />
              )}

            </>
          )}
        </PageShell>
        <CreateCourseDrawer
          open={showCreateDrawer}
          onOpenChange={handleCreateOpenChange}
        />
      </div>
  );
};

export default CoursesPage;
