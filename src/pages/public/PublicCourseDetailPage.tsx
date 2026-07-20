import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { PageState } from '@/components/page-state/page-state';
import { PublicCard } from '@/components/public/PublicCard';
import { DateBadge } from '@/components/ui/date-badge';
import { RichTextContent } from '@/components/ui/rich-text-content';
import { SegmentedTabs } from '@/components/teacher/SegmentedTabs';
import { LocationCard } from '@/components/public/course-details/LocationCard';
import { ScheduleDialog } from '@/components/public/course-details/CourseDetailContent';
import { getBookingTiles, type TicketTile, type TicketId } from '@/components/public/course-details/BookingRailLite';
import {
  buildDropInSublabel,
  buildDurationShort,
  buildMetaCardRows,
  buildNextSessionLabel,
  capitalize,
  formatFullDate,
} from '@/components/public/course-details/schedule-format';
import { fetchPublicCourseBySlug, resolveCourseImage, type PublicCourseWithDetails } from '@/services/publicCourses';
import { fetchSellerBySlug } from '@/services/sellers';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { osloNowKey } from '@/utils/dateUtils';
import { BrandFooter } from '@/components/public/BrandFooter';
import { ChevronLeft } from '@/lib/icons';
import { formatKroner, cn } from '@/lib/utils';
import type { AvailableTicketType, CourseSession } from '@/types/database';

interface DetailNavState {
  fromSlug?: string;
  fromName?: string | null;
}

export default function PublicCourseDetailPage() {
  const { slug, courseSlug } = useParams<{ slug: string; courseSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const navState = (location.state ?? null) as DetailNavState | null;
  const [scheduleOpen, setScheduleOpen] = useState(false);
  // Lifted out of the hero component: whether an image exists decides the
  // whole page's layout (two-column vs single-column), not just the hero.
  const [heroFailed, setHeroFailed] = useState(false);

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

  // The page stays mounted across course navigations — a failed hero on one
  // course must not collapse the layout of the next.
  useEffect(() => {
    setHeroFailed(false);
  }, [slug, courseSlug]);

  const course = detailQuery.data?.kind === 'ok' ? detailQuery.data.course : null;
  const sessions = detailQuery.data?.kind === 'ok' ? detailQuery.data.sessions : [];
  const tiers = detailQuery.data?.kind === 'ok' ? detailQuery.data.tiers : [];

  // "Already enrolled": a signed-in buyer with a confirmed signup gets a
  // confirmation state in the booking card instead of a CTA that would only
  // run into the checkout's duplicate guard. Guest bookings not yet claimed
  // by an account have no buyer_id — they keep the normal CTA (fail open:
  // any read hiccup must never block booking).
  const enrolledQuery = useQuery({
    queryKey: ['own-course-signup', course?.id, user?.id],
    enabled: !!user?.id && !!course?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('signups')
        .select('participant_email')
        .eq('course_id', course!.id)
        .eq('buyer_id', user!.id)
        .eq('status', 'confirmed')
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
  });
  const enrolled = enrolledQuery.data
    ? { email: enrolledQuery.data.participant_email }
    : null;
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

  // Same tile/state derivation the checkout page and this page's booking
  // card both render off — one source of truth, no drift.
  const { tiles, courseFull, soldOut, closed } = course
    ? getBookingTiles(course, tiers, buildDropInSublabel(sessions))
    : { tiles: [], courseFull: false, soldOut: false, closed: false };

  const checkoutHref = course ? `/${slug}/${course.slug}/pamelding` : '';
  const paymentNotReady = tiles.some((t) => t.amount > 0) && !course?.seller?.stripe_onboarding_complete;

  // Date lockup next to the calendar tile: the written date is the primary
  // line (the tile alone reads naked — Luma writes the date out too), the
  // time under it. Without a start date the time line is promoted.
  const metaRows = course ? buildMetaCardRows(course, sessions.length) : [];
  const tidLabel = metaRows.find((r) => r.label === 'Tid')?.value ?? '';
  const dateLine = course?.start_date ? capitalize(formatFullDate(course.start_date)) : null;
  const weeksLabel = course ? buildDurationShort(course, sessions.length) : '';

  // No image (or a broken URL) → the 300px image column would be a card
  // floating over dead white space. The layout reflows to one centered
  // column instead (ClassPass/Fresha pattern: the slot disappears, no
  // placeholder art), with the Arrangør card after the content.
  const heroImg = course ? resolveCourseImage(course) : null;
  const hasHero = !!heroImg && !heroFailed;

  // The skeleton mirrors whichever layout the loaded page will use. Arriving
  // from the storefront agenda the course is already in that query's cache,
  // so the answer is known before this page's own fetch resolves; a direct
  // load guesses single-column (the common case for new studios).
  const queryClient = useQueryClient();
  const cachedStorefront = queryClient.getQueryData<{ courses: PublicCourseWithDetails[] }>([
    'storefront',
    slug,
  ]);
  const cachedCourse = cachedStorefront?.courses.find((c) => c.slug === courseSlug);
  const skeletonTwoCol = course
    ? hasHero
    : !!cachedCourse && !!resolveCourseImage(cachedCourse);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="w-full flex-1 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {loading && <CourseDetailSkeletonBody twoCol={skeletonTwoCol} />}

        {loadFailed && !loading && <PageState variant="server-error" as="div" />}
        {notFound && !loading && <PageState variant="public-course" as="div" />}

        {!loading && !loadFailed && !notFound && course && (
          <div className={cn(!hasHero && 'mx-auto w-full max-w-[640px]')}>
            <Link
              to={backHref}
              className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft className="size-4" strokeWidth={1.75} />
              Tilbake til kursoversikten
            </Link>

            <div
              className={cn(
                'mt-6',
                hasHero && 'grid items-start gap-8 md:grid-cols-[300px_minmax(0,1fr)] lg:gap-12',
              )}
            >
              {hasHero && (
                <div>
                  <CourseHeroImage src={heroImg!} onFailed={() => setHeroFailed(true)} />
                  <SellerCard course={course} className="mt-4 max-md:hidden" />
                </div>
              )}

              <div className="min-w-0">
                <h1 className="text-4xl font-medium text-foreground">{course.title}</h1>

                {/* Metadata band directly under the title: two parallel
                    outlined tiles stretched across the column — calendar
                    tile + date/time, avatar + arrangør (name primary, role
                    label muted under, same anatomy in both). The arrangør
                    tile stands in for the bordered rail card wherever that
                    card isn't shown (no-image layout + mobile); with an
                    image on desktop the rail card stays and the date tile
                    spans alone. Stacks on narrow screens. */}
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <div className="flex flex-1 items-center gap-3 rounded-xl border border-border-subtle px-4 py-3">
                    {/* Default 48px tile — the sm 40px one read undersized
                        next to the two-line date/time lockup. */}
                    <DateBadge dateStr={course.start_date ?? undefined} />
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-foreground">
                        {dateLine ?? tidLabel}
                      </p>
                      {dateLine && tidLabel && (
                        <p className="mt-0.5 text-sm text-foreground-muted">{tidLabel}</p>
                      )}
                      {/* One session = date + time say everything; «1 økt»
                          is noise. Multi-session courses get count +
                          calendar. */}
                      {sessions.length > 1 && (
                        <p className="mt-0.5 text-sm text-foreground-muted">
                          {weeksLabel}
                          {' · '}
                          <button
                            type="button"
                            onClick={() => setScheduleOpen(true)}
                            className="cursor-pointer underline underline-offset-2 hover:text-foreground"
                          >
                            Se alle datoer
                          </button>
                        </p>
                      )}
                    </div>
                  </div>

                  <SellerLockup
                    course={course}
                    className={cn(
                      'flex-1 rounded-xl border border-border-subtle px-4 py-3',
                      hasHero && 'md:hidden',
                    )}
                  />
                </div>

                <BookingCard
                  course={course}
                  tiles={tiles}
                  courseFull={courseFull}
                  soldOut={soldOut}
                  closed={closed}
                  paymentNotReady={paymentNotReady}
                  enrolled={enrolled}
                  checkoutHref={checkoutHref}
                  sessions={sessions}
                  className="mt-7"
                />

                {course.description && (
                  <section className="mt-8 border-t border-border-subtle pt-8">
                    <h2 className="text-base font-medium mb-3">Om kurset</h2>
                    <RichTextContent
                      html={course.description}
                      className="text-base leading-relaxed text-foreground"
                    />
                  </section>
                )}

                {course.location && (
                  <section className="mt-8 border-t border-border-subtle pt-8">
                    <h2 className="text-base font-medium mb-3">Sted</h2>
                    <LocationCard
                      location={course.location}
                      lat={course.location_lat}
                      lon={course.location_lon}
                      placeId={course.location_place_id}
                    />
                  </section>
                )}

              </div>
            </div>

            <ScheduleDialog
              open={scheduleOpen}
              onOpenChange={setScheduleOpen}
              sessions={sessions}
              duration={course.duration}
            />
          </div>
        )}
      </main>
      <BrandFooter />
    </div>
  );
}

// ── Hero image ──────────────────────────────────────────────────────────

function CourseHeroImage({ src, onFailed }: { src: string; onFailed: () => void }) {
  // A broken image URL reports up so the page can reflow to the single-column
  // no-image layout rather than leaving a broken-image glyph on the page.
  return (
    <div className="aspect-square w-full overflow-hidden rounded-2xl bg-muted">
      <img
        src={src}
        alt=""
        className="media-outline size-full object-cover"
        onError={onFailed}
      />
    </div>
  );
}

// ── Arrangør ───────────────────────────────────────────────────────────────

/** Names who the participant actually meets: the course's instructor when
 * the studio has picked one, otherwise the studio itself. All attribution
 * lives in this one slot — no floating «Med …» line elsewhere. The studio
 * logo only backs the avatar when the slot shows the studio's own name. */
function sellerIdentity(course: PublicCourseWithDetails): {
  name: string | undefined;
  avatarSrc: string | null | undefined;
} {
  const instructor = course.instructor_name?.trim() || null;
  const name = instructor ?? course.seller?.name;
  const avatarSrc =
    !instructor || instructor === course.seller?.name ? course.seller?.logo_url : undefined;
  return { name, avatarSrc };
}

/** Bordered Arrangør card — the image rail's variant (desktop with image). */
function SellerCard({ course, className }: { course: PublicCourseWithDetails; className?: string }) {
  const { name, avatarSrc } = sellerIdentity(course);
  return (
    <PublicCard header={<span>Arrangør</span>} className={className} bodyClassName="p-3">
      <div className="flex items-center gap-3">
        <UserAvatar name={name} src={avatarSrc} size="md" />
        <span className="text-sm font-medium text-foreground">{name}</span>
      </div>
    </PublicCard>
  );
}

/** Containerless Arrangør lockup for the metadata band — same anatomy as the
 * date lockup beside it: 48px icon, name primary, muted role label under. */
function SellerLockup({ course, className }: { course: PublicCourseWithDetails; className?: string }) {
  const { name, avatarSrc } = sellerIdentity(course);
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <UserAvatar name={name} src={avatarSrc} className="size-12" />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-medium text-foreground">{name}</p>
        <p className="mt-0.5 text-sm text-foreground-muted">Arrangør</p>
      </div>
    </div>
  );
}

// ── Booking card ───────────────────────────────────────────────────────────

interface BookingCardProps {
  course: PublicCourseWithDetails;
  tiles: TicketTile[];
  courseFull: boolean;
  soldOut: boolean;
  closed: boolean;
  paymentNotReady: boolean;
  enrolled: { email: string } | null;
  checkoutHref: string;
  /** Not read directly — the drop-in next-session lookup below re-queries
   * live data (mirrors the checkout page's own lookup) rather than deriving
   * from the page's already-fetched list, so this stays for the caller's
   * type/prop shape parity with the page's `sessions` state. */
  sessions: CourseSession[];
  className?: string;
}

function BookingCard({
  course,
  tiles,
  courseFull,
  soldOut,
  closed,
  paymentNotReady,
  enrolled,
  checkoutHref,
  className,
}: BookingCardProps) {
  const mainTile = tiles.find((t) => t.id === 'main') ?? null;
  const dropInTile = tiles.find((t) => t.id === 'drop-in') ?? null;
  const [selected, setSelected] = useState<TicketId>(mainTile ? 'main' : 'drop-in');

  const hasDropInTile = dropInTile != null;
  // undefined = loading / not applicable, null = no upcoming session.
  const [dropInSessionId, setDropInSessionId] = useState<string | null | undefined>(undefined);
  const [dropInNextSession, setDropInNextSession] = useState<
    { session_date: string; start_time: string } | null | undefined
  >(undefined);
  const [dropInLookupFailed, setDropInLookupFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDropInLookupFailed(false);
    if (!hasDropInTile) {
      setDropInSessionId(undefined);
      setDropInNextSession(undefined);
      return;
    }
    void (async () => {
      // Session rows store naive Norwegian local times — compare against
      // "now" in Europe/Oslo ("YYYY-MM-DD HH:mm:ss", lexically ordered).
      const osloNow = osloNowKey();
      const { data, error } = await supabase
        .from('course_sessions')
        .select('id, session_date, start_time, status')
        .eq('course_id', course.id)
        .gte('session_date', osloNow.slice(0, 10))
        .neq('status', 'cancelled')
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(10);
      if (cancelled) return;
      if (error) {
        setDropInSessionId(undefined);
        setDropInNextSession(undefined);
        setDropInLookupFailed(true);
        return;
      }
      const next = (data as { id: string; session_date: string; start_time: string }[] | null)?.find(
        (s) => `${s.session_date} ${s.start_time}` > osloNow,
      );
      setDropInSessionId(next?.id ?? null);
      setDropInNextSession(next ? { session_date: next.session_date, start_time: next.start_time } : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [hasDropInTile, course.id]);

  const lowStock = mainTile != null && course.spots_available >= 1 && course.spots_available <= 3;

  const header = (
    <>
      <span>Påmelding</span>
      {lowStock && (
        <span className="text-xs font-normal tabular-nums text-warning">
          {course.spots_available} {course.spots_available === 1 ? 'plass' : 'plasser'} igjen
        </span>
      )}
    </>
  );

  /** Drop-in tier's sublabel — the resolved next session when available,
   * falling back to the tile's own sublabel while the lookup is in flight. */
  function resolveDropInSublabel(tile: TicketTile): string | null {
    return buildNextSessionLabel(dropInNextSession ?? null) ?? tile.sublabel;
  }

  /** CTA for a given tile. A drop-in tile gates on the next-session lookup —
   * loading, no upcoming session, or a failed query each replace the working
   * button with a disabled one and an explanatory line. Order matters: a
   * failed lookup also leaves `dropInSessionId` at `undefined` (mirrors
   * checkout), so the failure check must run before the loading check. */
  function renderCta(tile: TicketTile, billett: TicketId) {
    if (tile.id === 'drop-in') {
      if (dropInLookupFailed) {
        return (
          <>
            <p className="mt-3 text-sm text-danger text-center">Kunne ikke hente neste time. Prøv igjen.</p>
            <Button size="cta" disabled className="w-full mt-3">Gå til betaling</Button>
          </>
        );
      }
      if (dropInSessionId === undefined) {
        return (
          <Button size="cta" disabled loading className="w-full mt-4">
            Gå til betaling
          </Button>
        );
      }
      if (dropInSessionId === null) {
        return (
          <>
            <p className="mt-3 text-sm text-danger text-center">Ingen kommende timer for drop-in.</p>
            <Button size="cta" disabled className="w-full mt-3">Gå til betaling</Button>
          </>
        );
      }
    }
    return (
      <Button asChild size="cta" className="w-full mt-4">
        <Link to={`${checkoutHref}?billett=${billett}`}>
          {tile.amount === 0 ? 'Gå til påmelding' : 'Gå til betaling'}
        </Link>
      </Button>
    );
  }

  // 1. Enrolled — wins over every other state. The ticket UI stays exactly
  // as the normal purchasable state (frozen: tabs disabled, tier row in
  // normal colors); only the CTA changes — a disabled "Du er påmeldt" button
  // with a quiet underlined link to the buyer dashboard below it.
  if (enrolled) {
    const enrolledTile =
      mainTile && dropInTile
        ? (selected === 'drop-in' ? dropInTile : mainTile)
        : (mainTile ?? dropInTile);
    return (
      <PublicCard header={header} className={className}>
        {mainTile && dropInTile && (
          <SegmentedTabs<TicketId>
            role="radiogroup"
            ariaLabel="Billett"
            stretch
            size="lg"
            disabled
            value={selected}
            onChange={setSelected}
            tabs={[
              { key: 'main', label: mainTile.label },
              { key: 'drop-in', label: dropInTile.label },
            ]}
          />
        )}
        {enrolledTile && (
          <div className={mainTile && dropInTile ? 'mt-3' : undefined}>
            <TierRow
              label={enrolledTile.label}
              sublabel={
                enrolledTile.id === 'drop-in' ? resolveDropInSublabel(enrolledTile) : enrolledTile.sublabel
              }
              amount={enrolledTile.amount}
              prorated={enrolledTile.prorated}
              coursePrice={course.price}
            />
          </div>
        )}
        <Button size="cta" disabled className={cn('w-full', enrolledTile && 'mt-4')}>
          Du er påmeldt
        </Button>
        <p className="mt-3 text-center">
          <Link
            to="/overview"
            className="text-[13px] text-foreground-muted underline underline-offset-2 hover:text-foreground"
          >
            Se påmelding
          </Link>
        </p>
      </PublicCard>
    );
  }

  const hasQuietTiles = mainTile != null || dropInTile != null;
  const quietTiles = (
    <>
      {mainTile && (
        <TierRow
          label={mainTile.label}
          sublabel={mainTile.sublabel}
          amount={mainTile.amount}
          prorated={mainTile.prorated}
          coursePrice={course.price}
          quiet
        />
      )}
      {dropInTile && (
        <TierRow
          label={dropInTile.label}
          sublabel={dropInTile.sublabel}
          amount={dropInTile.amount}
          quiet
          className={mainTile ? 'mt-3' : undefined}
        />
      )}
    </>
  );

  // 2. Cancelled.
  if (course.status === 'cancelled') {
    return (
      <PublicCard header={header} className={className}>
        {quietTiles}
        <Button size="cta" disabled className={cn('w-full', hasQuietTiles && 'mt-4')}>
          Kurset er avlyst
        </Button>
      </PublicCard>
    );
  }

  // 3. Sold out.
  if (soldOut) {
    return (
      <PublicCard header={header} className={className}>
        {quietTiles}
        <Button size="cta" disabled className={cn('w-full', hasQuietTiles && 'mt-4')}>
          Kurset er fullt
        </Button>
      </PublicCard>
    );
  }

  // 4. Closed.
  if (closed) {
    return (
      <PublicCard header={header} className={className}>
        {quietTiles}
        <Button size="cta" disabled className={cn('w-full', hasQuietTiles && 'mt-4')}>
          Påmelding stengt
        </Button>
      </PublicCard>
    );
  }

  // 5. Payment not ready (seller mid Stripe onboarding).
  if (paymentNotReady) {
    return (
      <PublicCard header={header} className={className}>
        {quietTiles}
        <Button size="cta" disabled className={cn('w-full', hasQuietTiles && 'mt-4')}>
          Påmelding åpner snart
        </Button>
      </PublicCard>
    );
  }

  // 6. Package full, drop-in still open. The package row stays visible as a
  // disabled price anchor ("Fullt" sublabel, everything disabled-toned) —
  // the tier RPC withheld the tile, so the label falls back to the same
  // "Hele kurset" string the DB tier carries and the amount to course.price.
  // No SegmentedTabs: there's no real choice, only drop-in is purchasable.
  if (courseFull && dropInTile) {
    return (
      <PublicCard header={header} className={className}>
        <TierRow
          label="Hele kurset"
          sublabel="Fullt"
          amount={course.price ?? 0}
          quiet
          quietSublabel
        />
        <div className="mt-3 border-t border-border-subtle pt-3">
          <TierRow
            label={dropInTile.label}
            sublabel={resolveDropInSublabel(dropInTile)}
            amount={dropInTile.amount}
          />
        </div>
        {renderCta(dropInTile, 'drop-in')}
      </PublicCard>
    );
  }

  // 7. Real choice — main + drop-in.
  if (mainTile && dropInTile) {
    const selectedTile = selected === 'drop-in' ? dropInTile : mainTile;
    return (
      <PublicCard header={header} className={className}>
        <SegmentedTabs<TicketId>
          role="radiogroup"
          ariaLabel="Billett"
          stretch
          size="lg"
          value={selected}
          onChange={setSelected}
          tabs={[
            { key: 'main', label: mainTile.label },
            { key: 'drop-in', label: dropInTile.label },
          ]}
        />
        <div className="mt-3">
          <TierRow
            label={selectedTile.label}
            sublabel={selectedTile.id === 'drop-in' ? resolveDropInSublabel(selectedTile) : selectedTile.sublabel}
            amount={selectedTile.amount}
            prorated={selectedTile.prorated}
            coursePrice={course.price}
          />
        </div>
        {renderCta(selectedTile, selected)}
      </PublicCard>
    );
  }

  // 8. Single tile — whichever one survived (main-only, or drop-in-only when
  // the package is withheld by the tier RPC for a reason other than
  // courseFull, e.g. late-signup policy).
  const soleTile = mainTile ?? dropInTile;
  if (soleTile) {
    return (
      <PublicCard header={header} className={className}>
        <TierRow
          label={soleTile.label}
          sublabel={soleTile.id === 'drop-in' ? resolveDropInSublabel(soleTile) : soleTile.sublabel}
          amount={soleTile.amount}
          prorated={soleTile.prorated}
          coursePrice={course.price}
        />
        {renderCta(soleTile, soleTile.id)}
      </PublicCard>
    );
  }

  return null;
}

function TierRow({
  label,
  sublabel,
  amount,
  prorated = false,
  coursePrice,
  quiet = false,
  quietSublabel = false,
  className,
}: {
  label: string;
  sublabel: string | null;
  amount: number;
  prorated?: boolean;
  coursePrice?: number | null;
  quiet?: boolean;
  /** Also drop the sublabel to the disabled tone (the package-full anchor
   * row's "Fullt"); plain `quiet` keeps sublabels muted per the base spec. */
  quietSublabel?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4', className)}>
      <span className={cn('text-[15px] font-medium', quiet ? 'text-foreground-disabled' : 'text-foreground')}>
        {label}
        {sublabel && (
          <span
            className={cn(
              'block text-[13px] font-normal',
              quietSublabel ? 'text-foreground-disabled' : 'text-foreground-muted',
            )}
          >
            {sublabel}
          </span>
        )}
      </span>
      <span className={cn('text-[17px] font-medium tabular-nums', quiet ? 'text-foreground-disabled' : 'text-foreground')}>
        {prorated && coursePrice != null && (
          <s className="mr-1.5 text-sm font-normal text-foreground-disabled">{formatKroner(coursePrice)}</s>
        )}
        {amount === 0 ? 'Gratis' : formatKroner(amount)}
      </span>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────

/** Shared body so the page's inline loading branch and the standalone export
 * (used by dev previews) render identical markup without duplicating it.
 * Mirrors the loaded page's two layouts: `twoCol` for courses with an image,
 * otherwise the centered single column. */
function CourseDetailSkeletonBody({ twoCol = false }: { twoCol?: boolean }) {
  if (!twoCol) {
    return (
      <div
        className="mx-auto w-full max-w-[640px] animate-in fade-in duration-150"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Laster…</span>
        <Skeleton className="h-4 w-40" />
        <div className="mt-6">
          <Skeleton className="h-10 w-3/4" />
          {/* Metadata band: two stretched outlined tiles */}
          <div className="mt-5 flex gap-3">
            <Skeleton className="h-18 flex-1 rounded-xl" />
            <Skeleton className="h-18 flex-1 rounded-xl" />
          </div>
          <Skeleton className="mt-7 h-48 w-full rounded-2xl" />
          <Skeleton className="mt-8 h-32 w-full" />
        </div>
      </div>
    );
  }
  return (
    <div className="animate-in fade-in duration-150" role="status" aria-live="polite">
      <span className="sr-only">Laster…</span>
      <Skeleton className="h-4 w-40" />
      <div className="mt-6 grid items-start gap-8 md:grid-cols-[300px_minmax(0,1fr)] lg:gap-12">
        <div>
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <Skeleton className="mt-4 h-16 w-full rounded-2xl max-md:hidden" />
        </div>
        <div className="min-w-0">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="mt-5 h-10 w-64" />
          <Skeleton className="mt-7 h-48 w-full rounded-2xl" />
          <Skeleton className="mt-8 h-32 w-full" />
        </div>
      </div>
    </div>
  );
}

export function CourseDetailSkeleton({ twoCol = false }: { twoCol?: boolean }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="w-full flex-1 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <CourseDetailSkeletonBody twoCol={twoCol} />
      </main>
      <BrandFooter />
    </div>
  );
}
