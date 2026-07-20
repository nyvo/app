import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { PageState } from '@/components/page-state/page-state';
import { DelayedFallback } from '@/components/ui/delayed-fallback';
import { fetchPublicCourses, type PublicCourseWithDetails } from '@/services/publicCourses';
import { fetchPublicStudioLocation, fetchSellerBySlug, type PublicSeller } from '@/services/sellers';
import { toLocalDate } from '@/utils/dateUtils';
import { StudioMasthead } from '@/components/public/studio/StudioMasthead';
import { StudioAgendaList } from '@/components/public/studio/StudioAgendaList';
import { StudioFilterPill } from '@/components/public/studio/StudioFilterPill';
import { deriveStudioFacts, type StudioLocation } from '@/components/public/studio/studioFacts';
import { useDocumentTitle } from '@/hooks/use-document-title';

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
  const [typeFilter, setTypeFilter] = useState<CourseTypeFilter>('all');
  const [instructorFilter, setInstructorFilter] = useState<string>('all');

  // Seller lookup keyed on the raw URL slug (which may be an archived alias).
  // useQuery replaces the old hand-rolled effect: overlapping loads from fast
  // A→B navigation can no longer land out of order, and revisits within
  // staleTime render from cache instantly.
  const sellerQuery = useQuery({
    queryKey: ['public-seller', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await fetchSellerBySlug(slug!);
      if (error) throw error;
      return data; // null = no such studio
    },
  });

  // Archived-alias rewrite: settle shares/bookmarks on the canonical slug.
  useEffect(() => {
    const seller = sellerQuery.data;
    if (seller && slug && seller.slug !== slug) {
      navigate(`/${seller.slug}`, { replace: true });
    }
  }, [sellerQuery.data, slug, navigate]);

  const isCanonical = !!sellerQuery.data && sellerQuery.data.slug === slug;

  const contentQuery = useQuery({
    queryKey: ['storefront', slug],
    enabled: isCanonical,
    queryFn: async () => {
      const activeResult = await fetchPublicCourses({ teamSlug: slug! });
      if (activeResult.error) throw activeResult.error;
      return { courses: activeResult.data || [] };
    },
  });

  const organization: PublicSeller | null = isCanonical ? (sellerQuery.data ?? null) : null;
  const courses = contentQuery.data?.courses ?? [];

  const redirecting = !!sellerQuery.data && !!slug && sellerQuery.data.slug !== slug;
  const loading =
    sellerQuery.isPending || redirecting || (isCanonical && contentQuery.isPending);
  // A transient seller-fetch failure is 'load-failed' (retryable), NOT
  // 'not-found' — telling a visitor the studio doesn't exist on a network
  // blip is the false-empty-state bug this migration exists to kill.
  const errorKind: ErrorKind | null = !slug
    ? 'not-found'
    : !sellerQuery.isPending && sellerQuery.data === null
      ? 'not-found'
      : sellerQuery.isError || contentQuery.isError
        ? 'load-failed'
        : null;

  useDocumentTitle(organization?.name);

  const visible = useMemo(() => courses.filter(isVisible), [courses]);

  const sorted = useMemo(
    () => visible.slice().sort((a, b) => getDisplayDateMs(a) - getDisplayDateMs(b)),
    [visible],
  );

  const facts = useMemo(() => deriveStudioFacts(visible), [visible]);

  // The studio's own address (set on the Studio page) — anon-safe DEFINER RPC.
  // Pending/failed reads fall back to the course-derived location below
  // rather than blocking or erroring the page.
  const addressQuery = useQuery({
    queryKey: ['studio-address', slug],
    enabled: isCanonical,
    queryFn: async () => {
      const { data, error } = await fetchPublicStudioLocation(slug!);
      if (error) throw error;
      return data; // null = no address set
    },
  });

  // Canonical studio address first; otherwise the most-used physical course
  // location (coords + place id saved by the course builder).
  const displayLocation: StudioLocation | null = addressQuery.data
    ? {
        label: addressQuery.data.name,
        address: addressQuery.data.address,
        lat: addressQuery.data.lat,
        lon: addressQuery.data.lon,
        placeId: addressQuery.data.placeId,
      }
    : facts.primaryLocation;

  // Course-type filter — an option earns its place only when it PARTITIONS
  // the list (matches some courses but not all). An option every course
  // matches, or none does, can't change the result set and would make the
  // control decorative — with no partitioning option the pill disappears.
  const typeOptions = useMemo(() => {
    const candidates: { value: CourseTypeFilter; label: string }[] = [
      { value: 'series', label: 'Kursrekker' },
      { value: 'workshop', label: 'Workshops' },
      { value: 'drop-in', label: 'Drop-in' },
      { value: 'online', label: 'Nettkurs' },
    ];
    const partitioning = candidates.filter((option) => {
      const matches = visible.filter((course) => matchesTypeFilter(course, option.value)).length;
      return matches > 0 && matches < visible.length;
    });
    if (partitioning.length === 0) return [];
    return [{ value: 'all' as const, label: 'Alle kurstyper' }, ...partitioning];
  }, [visible]);

  // Instructor filter — same partition rule (≥2 instructors alone isn't
  // enough: if every course lists both names, the filter changes nothing).
  const instructorOptions = useMemo(() => {
    if (facts.instructors.length < 2) return [];
    const partitioning = facts.instructors.filter((name) => {
      const matches = visible.filter((course) =>
        course.instructors.some((i) => i.name === name),
      ).length;
      return matches > 0 && matches < visible.length;
    });
    if (partitioning.length === 0) return [];
    return [
      { value: 'all', label: 'Alle instruktører' },
      ...partitioning.map((name) => ({ value: name, label: name })),
    ];
  }, [facts.instructors, visible]);

  // A refetch can retire the selected option (e.g. the last workshop closes);
  // fall back to 'all' rather than filtering on a value the pill can't show.
  const effectiveTypeFilter = typeOptions.some((o) => o.value === typeFilter) ? typeFilter : 'all';
  const effectiveInstructorFilter = instructorOptions.some((o) => o.value === instructorFilter)
    ? instructorFilter
    : 'all';

  const filteredCourses = useMemo(
    () => sorted.filter((course) =>
      matchesTypeFilter(course, effectiveTypeFilter)
      && (effectiveInstructorFilter === 'all'
        || course.instructors.some((i) => i.name === effectiveInstructorFilter)),
    ),
    [sorted, effectiveTypeFilter, effectiveInstructorFilter],
  );

  const hasFilters = typeOptions.length > 0 || instructorOptions.length > 0;
  const filtersActive = effectiveTypeFilter !== 'all' || effectiveInstructorFilter !== 'all';

  const resetFilters = () => {
    setTypeFilter('all');
    setInstructorFilter('all');
  };

  // The one control row between masthead and agenda (mockup Q1): filters
  // only — the date headers in the list are the navigation.
  const filters = hasFilters ? (
    <div className="flex flex-wrap items-center gap-2">
      {typeOptions.length > 0 && (
        <StudioFilterPill
          value={effectiveTypeFilter}
          onChange={setTypeFilter}
          options={typeOptions}
          ariaLabel="Filtrer på kurstype"
        />
      )}
      {instructorOptions.length > 0 && (
        <StudioFilterPill
          value={effectiveInstructorFilter}
          onChange={setInstructorFilter}
          options={instructorOptions}
          ariaLabel="Filtrer på instruktør"
        />
      )}
    </div>
  ) : null;

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-x-hidden flex flex-col">
      <main className="flex-1">
        {loading && <DelayedFallback><StudioPageSkeleton /></DelayedFallback>}

        {errorKind === 'not-found' && !loading && (
          <PageState variant="public-team" as="div" />
        )}

        {errorKind === 'load-failed' && !loading && (
          <PageState variant="server-error" as="div" />
        )}

        {organization && !loading && !errorKind && (
          <div className="animate-in fade-in duration-150">
            <StudioMasthead organization={organization} location={displayLocation} />

            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              {visible.length === 0 ? (
                /* Truly empty: keep the masthead, say it in plain text — no
                 * illustration card (Time2book/SeatGeek pattern). */
                <div className="pt-10 pb-24">
                  <p className="text-base font-medium text-foreground">Ingen planlagte kurs</p>
                </div>
              ) : (
                <div className="pt-8 pb-16">
                  {filters}
                  {filteredCourses.length === 0 ? (
                    /* Filtered empty: one inline sentence + recovery link,
                     * page structure retained (Skillshare pattern). */
                    <p className="py-8 text-base text-foreground-muted">
                      Ingen kurs passer filteret.{' '}
                      {filtersActive && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="text-primary underline underline-offset-2 hover:decoration-2"
                        >
                          Nullstill filter
                        </button>
                      )}
                    </p>
                  ) : (
                    <StudioAgendaList
                      courses={filteredCourses}
                      viewingSlug={slug}
                      viewingName={organization.name}
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
  // Mirrors the no-cover masthead (the common case — a cover band appearing
  // on swap is rarer than an empty band vanishing) and the text-row agenda
  // grammar without thumbnails.
  return (
    <div
      className="animate-in fade-in duration-150"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Laster…</span>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Profile lockup — logo tile, name + location stacked under */}
        <div className="pt-10 sm:pt-12">
          <Skeleton className="size-24 rounded-full" />
        </div>
        <Skeleton className="mt-4 h-9 w-64 max-w-full" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        {/* Filter pill + date-grouped agenda rows */}
        <div className="pt-8">
          <Skeleton className="h-8 w-32 rounded-full" />
          <div className="pt-6">
            {/* Date header */}
            <Skeleton className="h-5 w-44" />
            {/* Mirrors the agenda cards — filled bg-muted tiles, so the
                skeleton is the empty card shape itself (72px = py-3.5 pair
                + two text lines). */}
            <div className="mt-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-18 w-full rounded-xl" />
              ))}
            </div>
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
