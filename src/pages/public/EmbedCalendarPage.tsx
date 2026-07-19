import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { DelayedFallback } from '@/components/ui/delayed-fallback';
import { fetchPublicCourses, type PublicCourseWithDetails } from '@/services/publicCourses';
import { fetchSellerBySlug, type PublicSeller } from '@/services/sellers';
import { toLocalDate } from '@/utils/dateUtils';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { EmbedCalendar } from '@/components/public/embed/EmbedCalendar';

type ErrorKind = 'not-found' | 'load-failed';

const CANCELLED_GRACE_DAYS = 30;

// Same visibility rule the storefront uses: active/upcoming always, cancelled
// only within a 30-day grace window from start.
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

/**
 * Standalone calendar surface for embedding in a seller's own site via
 * `<iframe src="/embed/<slug>">`. No app nav, masthead or cookie banner — the
 * calendar is the whole page. Course rows link OUT to the detail page (new
 * tab) where booking happens. Marked noindex so it never competes with the
 * canonical storefront in search.
 */
const EmbedCalendarPage = () => {
  const { slug } = useParams<{ slug: string }>();

  // Keep this route out of search indexes; restore on unmount so navigating
  // away (dev) doesn't leave a stray noindex on other pages.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  // Single query: seller lookup, then courses on the canonical slug (handles
  // archived-alias URLs) while keeping the loaded slug for the out-links; the
  // detail page canonicalizes those on arrival. `null` data = no such studio.
  const embedQuery = useQuery({
    queryKey: ['embed-calendar', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data: sellerData, error: sellerError } = await fetchSellerBySlug(slug!);
      if (sellerError) throw sellerError;
      if (!sellerData) return null;

      const { data, error } = await fetchPublicCourses({ teamSlug: sellerData.slug });
      if (error) throw error;
      return { seller: sellerData as PublicSeller, courses: data || [] };
    },
  });

  const seller = embedQuery.data?.seller ?? null;
  const courses = embedQuery.data?.courses ?? [];
  const loading = !!slug && embedQuery.isPending;
  const errorKind: ErrorKind | null = !slug || (!embedQuery.isPending && embedQuery.data === null)
    ? 'not-found'
    : embedQuery.isError
      ? 'load-failed'
      : null;

  useDocumentTitle(seller?.name);

  const visible = useMemo(() => courses.filter(isVisible), [courses]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Wide enough that the widget's @2xl container breakpoint (672px) is
          reachable in a wide iframe; narrow iframes just get the stacked layout. */}
      <div className="mx-auto w-full max-w-4xl p-4 sm:p-6">
        {loading && (
          <DelayedFallback>
            <EmbedSkeleton />
          </DelayedFallback>
        )}

        {!loading && errorKind === 'not-found' && (
          <p className="py-20 text-center text-base text-foreground-muted">
            Fant ikke denne kalenderen.
          </p>
        )}

        {!loading && errorKind === 'load-failed' && (
          <p className="py-20 text-center text-base text-foreground-muted">
            Noe gikk galt – prøv igjen senere.
          </p>
        )}

        {!loading && !errorKind && seller && (
          <div className="animate-in fade-in duration-150">
            <EmbedCalendar courses={visible} slug={slug ?? seller.slug} sellerName={seller.name} />
          </div>
        )}
      </div>
    </div>
  );
};

function EmbedSkeleton() {
  // Mirrors EmbedCalendar's card shell exactly — same container breakpoint,
  // pane widths, paddings and row heights — so the swap doesn't jump.
  return (
    <div className="@container" role="status" aria-live="polite">
      <span className="sr-only">Laster…</span>
      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="flex flex-col @2xl:flex-row">
          <section className="shrink-0 p-5 @2xl:w-[328px]">
            <div className="mx-auto w-full max-w-72 @2xl:mx-0 @2xl:w-fit @2xl:max-w-none">
              <div className="mb-4 flex items-center justify-between gap-2">
                <Skeleton className="h-5 w-24" />
                <div className="flex items-center gap-1">
                  <Skeleton className="size-10 rounded-full" />
                  <Skeleton className="size-10 rounded-full" />
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {/* Weekday-initials row: spacing only, no pulse blocks. */}
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={`w${i}`} className="h-7" aria-hidden />
                ))}
                {Array.from({ length: 42 }).map((_, i) => (
                  <div key={i} className="flex aspect-square w-full items-center justify-center @2xl:size-9">
                    <Skeleton className="size-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="min-w-0 flex-1 border-t border-border-subtle p-5 @2xl:border-l @2xl:border-t-0">
            <div className="mb-3 @2xl:mb-4 @2xl:flex @2xl:h-10 @2xl:items-center">
              <Skeleton className="h-5 w-36" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
              ))}
            </div>
          </section>
        </div>
        <div className="border-t border-border-subtle px-5 py-3">
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

export default EmbedCalendarPage;
