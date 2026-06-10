import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageState } from '@/components/page-state/page-state';
import { fetchPublicCourses, type PublicCourseWithDetails } from '@/services/publicCourses';
import { fetchSellerBySlug, fetchStudioLocation, type PublicSeller, type StudioLocationRow } from '@/services/sellers';
import { toLocalDate } from '@/utils/dateUtils';
import { StudioMasthead } from '@/components/public/studio/StudioMasthead';
import { StudioDayList } from '@/components/public/studio/StudioDayList';
import { StudioFilterPill } from '@/components/public/studio/StudioFilterPill';
import { deriveStudioFacts, type StudioLocation } from '@/components/public/studio/studioFacts';

type ErrorKind = 'not-found' | 'load-failed';
type CourseTypeFilter = 'all' | 'series' | 'workshop' | 'drop-in' | 'online';

const CANCELLED_GRACE_DAYS = 30;

function isVisible(course: PublicCourseWithDetails): boolean {
  if (course.status === 'cancelled') {
    if (!course.start_date) return false;
    const graceMs = CANCELLED_GRACE_DAYS * 24 * 60 * 60 * 1000;
    const start = toLocalDate(course.start_date).getTime();
    if (isNaN(start)) return false;
    return Date.now() - start <= graceMs;
  }
  return course.status === 'active' || course.status === 'upcoming';
}

function getDisplayDateMs(course: PublicCourseWithDetails): number {
  const d = course.next_session?.session_date ?? course.start_date;
  if (!d) return Number.POSITIVE_INFINITY;
  const t = toLocalDate(d).getTime();
  return isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

const PublicCoursesPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<PublicSeller | null>(null);
  const [courses, setCourses] = useState<PublicCourseWithDetails[]>([]);
  const [studioLocation, setStudioLocation] = useState<StudioLocationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [typeFilter, setTypeFilter] = useState<CourseTypeFilter>('all');
  const [instructorFilter, setInstructorFilter] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      if (!slug) {
        setErrorKind('not-found');
        setLoading(false);
        return;
      }
      setLoading(true);
      setErrorKind(null);

      const { data: sellerData, error: sellerError } = await fetchSellerBySlug(slug);
      if (sellerError || !sellerData) {
        setErrorKind('not-found');
        setLoading(false);
        return;
      }

      // The URL slug may be an archived alias — rewrite to the canonical slug
      // so shares/bookmarks settle on the current URL. The effect re-runs with
      // the new param, so bail out here and let the next pass do the work.
      if (sellerData.slug !== slug) {
        navigate(`/${sellerData.slug}`, { replace: true });
        return;
      }

      setOrganization(sellerData);

      // Courses (required) + the studio's canonical location (best-effort) in
      // parallel. A missing/undeployed location RPC just yields null.
      const [activeResult, locationResult] = await Promise.all([
        fetchPublicCourses({ teamSlug: sellerData.slug }),
        fetchStudioLocation(sellerData.slug),
      ]);
      if (activeResult.error) {
        setErrorKind('load-failed');
        setLoading(false);
        return;
      }
      setCourses(activeResult.data || []);
      setStudioLocation(locationResult.data);
      setLoading(false);
    }
    loadData();
  }, [slug, navigate]);

  const visible = useMemo(() => courses.filter(isVisible), [courses]);

  const sorted = useMemo(
    () => visible.slice().sort((a, b) => getDisplayDateMs(a) - getDisplayDateMs(b)),
    [visible],
  );

  const facts = useMemo(() => deriveStudioFacts(visible), [visible]);

  // The display location: the studio's canonical one (Studio tab) when set,
  // else the most-used course location as a fallback.
  const displayLocation = useMemo<StudioLocation | null>(() => {
    if (studioLocation) {
      return {
        label: studioLocation.name,
        address: studioLocation.address,
        lat: studioLocation.lat,
        lon: studioLocation.lon,
        placeId: studioLocation.placeId,
      };
    }
    return facts.primaryLocation;
  }, [studioLocation, facts.primaryLocation]);

  // Course-type filter — only offer types that actually exist on this studio.
  const typeOptions = useMemo(() => {
    const candidates: { value: CourseTypeFilter; label: string }[] = [
      { value: 'all', label: 'Alle kurstyper' },
      { value: 'series', label: 'Kursrekker' },
      { value: 'workshop', label: 'Workshops' },
      { value: 'drop-in', label: 'Drop-in' },
      { value: 'online', label: 'Online' },
    ];
    return candidates.filter(
      (option) => option.value === 'all'
        || visible.some((course) => matchesTypeFilter(course, option.value)),
    );
  }, [visible]);

  // Instructor filter — only when the studio has more than one instructor.
  const instructorOptions = useMemo(() => {
    if (facts.instructors.length < 2) return [];
    return [
      { value: 'all', label: 'Alle instruktører' },
      ...facts.instructors.map((name) => ({ value: name, label: name })),
    ];
  }, [facts.instructors]);

  const filteredCourses = useMemo(
    () => sorted.filter((course) =>
      matchesTypeFilter(course, typeFilter)
      && (instructorFilter === 'all' || course.instructor_name === instructorFilter),
    ),
    [sorted, typeFilter, instructorFilter],
  );

  const filters = (typeOptions.length > 1 || instructorOptions.length > 0) ? (
    <div className="flex items-center gap-2">
      {typeOptions.length > 1 && (
        <StudioFilterPill
          value={typeFilter}
          onChange={setTypeFilter}
          options={typeOptions}
          allValue="all"
          ariaLabel="Filtrer på kurstype"
        />
      )}
      {instructorOptions.length > 0 && (
        <StudioFilterPill
          value={instructorFilter}
          onChange={setInstructorFilter}
          options={instructorOptions}
          allValue="all"
          ariaLabel="Filtrer på instruktør"
        />
      )}
    </div>
  ) : null;

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-x-hidden flex flex-col">
      <main className="flex-1">
        {loading && <StudioPageSkeleton />}

        {errorKind === 'not-found' && !loading && (
          <PageState variant="public-team" />
        )}

        {errorKind === 'load-failed' && !loading && (
          <PageState variant="server-error" />
        )}

        {organization && !loading && !errorKind && (
          <div className="animate-in fade-in duration-150">
            <StudioMasthead organization={organization} location={displayLocation} />

            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              {visible.length === 0 ? (
                <div className="py-16">
                  <EmptyState
                    title="Ingen planlagte kurs"
                    description="Det er ingen planlagte kurs akkurat nå. Kom tilbake snart."
                  />
                </div>
              ) : (
                <div className="pt-10 pb-20">
                  {filteredCourses.length === 0 ? (
                    <EmptyState
                      title="Ingen kurs i filteret"
                      description="Velg et annet filter for å se flere kurs."
                    />
                  ) : (
                    <StudioDayList
                      courses={filteredCourses}
                      viewingSlug={slug}
                      viewingName={organization.name}
                      headerAction={filters}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

function StudioPageSkeleton() {
  return (
    <div
      className="animate-in fade-in duration-150"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Laster…</span>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14">
        {/* Identity lockup — squircle logo + name + location */}
        <div className="flex items-start gap-5 sm:gap-6">
          <Skeleton className="size-20 sm:size-24 shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-3 pt-1">
            <Skeleton className="h-9 w-56 max-w-full" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        </div>
        {/* Day strip + rows */}
        <div className="pt-10 space-y-6">
          <Skeleton className="h-6 w-24" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px] w-28 shrink-0 rounded-2xl" />
            ))}
          </div>
          <div className="space-y-1 pt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function matchesTypeFilter(course: PublicCourseWithDetails, filter: CourseTypeFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'series') return course.format === 'series';
  if (filter === 'workshop') return course.format === 'single';
  if (filter === 'drop-in') return !!course.allows_drop_in;
  if (filter === 'online') return course.delivery_mode === 'online';
  return true;
}

export default PublicCoursesPage;
