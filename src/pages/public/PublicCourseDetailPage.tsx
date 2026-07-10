import { useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { PageState } from '@/components/page-state/page-state';
import { CourseDetailContent } from '@/components/public/course-details/CourseDetailContent';
import { getBookingTiles } from '@/components/public/course-details/BookingRailLite';
import { buildDropInSublabel } from '@/components/public/course-details/schedule-format';
import { MobilePriceBar } from '@/components/public/course-details/MobilePriceBar';
import { calculateTotalPrice } from '@/lib/pricing';
import { fetchPublicCourseBySlug, type PublicCourseWithDetails } from '@/services/publicCourses';
import { fetchSellerBySlug } from '@/services/sellers';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import type { AvailableTicketType, CourseSession } from '@/types/database';

interface DetailNavState {
  fromSlug?: string;
  fromName?: string | null;
}

export default function PublicCourseDetailPage() {
  const { slug, courseSlug } = useParams<{ slug: string; courseSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state ?? null) as DetailNavState | null;

  // One query owns the whole load. Redirect decisions are returned as data
  // (not performed inside the fetch) so the queryFn stays side-effect-free;
  // the effect below navigates, which changes the key and starts the next
  // load. Cache makes detail → back → detail instant within staleTime.
  type DetailResult =
    | { kind: 'redirect'; to: string }
    | { kind: 'not-found' }
    | {
        kind: 'ok';
        course: PublicCourseWithDetails;
        sessions: CourseSession[];
        tiers: AvailableTicketType[];
      };

  const detailQuery = useQuery({
    queryKey: ['public-course', slug, courseSlug],
    enabled: !!slug && !!courseSlug,
    queryFn: async (): Promise<DetailResult> => {
      // If the team-slug segment is an archived alias, redirect to the
      // canonical storefront URL first — the course lookup below scopes to a
      // current team slug, so passing the alias through would 404.
      const sellerLookup = await fetchSellerBySlug(slug!);
      if (sellerLookup.data && sellerLookup.data.slug !== slug) {
        return { kind: 'redirect', to: `/${sellerLookup.data.slug}/${courseSlug}` };
      }

      const courseRes = await fetchPublicCourseBySlug(slug!, courseSlug!);
      // A query/network failure is retryable — throw so the error boundary
      // renders server-error. Only a null row (error === null) is a genuine
      // not-found that gets the terminal "finnes ikke" state.
      if (courseRes.error) throw courseRes.error;
      if (!courseRes.data) {
        return { kind: 'not-found' };
      }

      // Canonical URL = owner's team slug. If the visitor landed via a
      // venue's storefront (syndicated affiliation), redirect to the
      // owner's URL so payment flows attach to the correct seller. The
      // back-link still resolves via `state.fromSlug` to where the user
      // came from — payment context and navigation context can differ.
      const ownerSlug = courseRes.data.seller?.slug;
      if (ownerSlug && ownerSlug !== slug) {
        return { kind: 'redirect', to: `/${ownerSlug}/${courseSlug}` };
      }

      // Sessions (schedule dialog + Timeplan strip) and sellable tiers.
      // Tiers come from the same `available_ticket_types` RPC checkout prices
      // from — single source of truth for availability and (prorated) price.
      const [sessionsRes, tiersRes] = await Promise.all([
        supabase
          .from('course_sessions')
          .select('*')
          .eq('course_id', courseRes.data.id)
          .order('session_date', { ascending: true }),
        supabase.rpc('available_ticket_types', { p_course_id: courseRes.data.id }),
      ]);
      // A failed sessions/tiers fetch is transient — throw both so the page
      // shows the retryable server-error instead of an empty schedule.
      if (sessionsRes.error) throw sessionsRes.error;
      if (tiersRes.error) throw tiersRes.error;
      return {
        kind: 'ok',
        course: courseRes.data,
        sessions: (sessionsRes.data ?? []) as CourseSession[],
        tiers: ((tiersRes.data ?? []) as AvailableTicketType[]).filter(
          (t) => t.audience === 'standard',
        ),
      };
    },
  });

  useEffect(() => {
    if (detailQuery.data?.kind === 'redirect') {
      navigate(detailQuery.data.to, { replace: true, state: location.state });
    }
  }, [detailQuery.data, navigate, location.state]);

  const course = detailQuery.data?.kind === 'ok' ? detailQuery.data.course : null;
  const sessions = detailQuery.data?.kind === 'ok' ? detailQuery.data.sessions : [];
  const tiers = detailQuery.data?.kind === 'ok' ? detailQuery.data.tiers : [];
  const loading = detailQuery.isPending || detailQuery.data?.kind === 'redirect';
  // Transient query failures get the retryable server-error; only a resolved
  // null row is the terminal "finnes ikke".
  const loadFailed = detailQuery.isError;
  const notFound = detailQuery.data?.kind === 'not-found';

  useDocumentTitle(course?.title);

  // Back link target: prefer the viewing storefront (state) over the
  // canonical owner — an affiliate storefront visitor should land back where
  // they came from, not the course's owner. Falls back to the route's own
  // slug, then "/", while data is still loading.
  const backHref = navState?.fromSlug
    ? `/${navState.fromSlug}`
    : course?.seller?.slug
      ? `/${course.seller.slug}`
      : slug
        ? `/${slug}`
        : '/';

  // Same tile/state derivation the booking card and MobilePriceBar both
  // render off — one source of truth, no drift between the two surfaces.
  const { tiles, courseFull, soldOut, closed, spotsLeft, lowStock } = course
    ? getBookingTiles(course, tiers, buildDropInSublabel(sessions))
    : { tiles: [], courseFull: false, soldOut: false, closed: false, spotsLeft: 0, lowStock: false };

  const checkoutHref = course ? `/${slug}/${course.slug}/pamelding` : '';
  const mainTile = tiles.find((t) => t.id === 'main') ?? tiles[0] ?? null;
  const mobileTotal = calculateTotalPrice(mainTile?.amount ?? 0);
  const paymentNotReady = tiles.some((t) => t.amount > 0) && !course?.seller?.stripe_onboarding_complete;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="flex w-full items-center justify-center px-4 py-8 sm:px-6">
        <Link to={`/${slug}`} className="flex select-none items-center">
          <span className="text-base font-medium text-foreground">Openspot</span>
        </Link>
      </header>

      <main className="flex-1">
        {loading && <CourseDetailSkeleton />}

        {loadFailed && !loading && <PageState variant="server-error" as="div" />}
        {notFound && !loading && <PageState variant="public-course" as="div" />}

        {!loading && !loadFailed && !notFound && course && (
          <>
            <CourseDetailContent
              course={course}
              sessions={sessions}
              tiles={tiles}
              courseFull={courseFull}
              soldOut={soldOut}
              closed={closed}
              spotsLeft={spotsLeft}
              lowStock={lowStock}
              checkoutHref={checkoutHref}
              backHref={backHref}
            />
            <MobilePriceBar
              selectedTile={mainTile}
              total={mobileTotal}
              href={checkoutHref}
              soldOut={soldOut}
              closed={closed}
              paymentNotReady={paymentNotReady}
              ctaLabel="Meld deg på"
            />
          </>
        )}
      </main>
    </div>
  );
}

function CourseDetailSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[640px] px-4 pb-16 sm:px-6 animate-in fade-in duration-150"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Laster…</span>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-7 aspect-[21/9] w-full rounded-2xl" />
      <Skeleton className="mt-7 h-10 w-3/4" />
      <Skeleton className="mt-[22px] h-16 w-full" />
      <Skeleton className="mt-[26px] h-24 w-full rounded-xl" />
      <Skeleton className="mt-8 h-32 w-full" />
    </div>
  );
}
