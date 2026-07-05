import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, Calendar, ChevronLeft } from '@/lib/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { toLocalDate, osloNowKey, osloTodayKey } from '@/utils/dateUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { LocationCard } from '@/components/public/course-details/LocationCard';
import { BookingRailLite } from '@/components/public/course-details/BookingRailLite';
import { RichTextContent } from '@/components/ui/rich-text-content';
import { PageState } from '@/components/page-state/page-state';
import { resolveCourseImage, fetchPublicCourseBySlug, type PublicCourseWithDetails } from '@/services/publicCourses';
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
      if (courseRes.error || !courseRes.data) {
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

      // Sessions (schedule dialog + "next class" labels) and sellable tiers.
      // Tiers come from the same `available_ticket_types` RPC checkout prices
      // from — single source of truth for availability and (prorated) price.
      const [{ data: sessionRows }, tiersRes] = await Promise.all([
        supabase
          .from('course_sessions')
          .select('*')
          .eq('course_id', courseRes.data.id)
          .order('session_date', { ascending: true }),
        supabase.rpc('available_ticket_types', { p_course_id: courseRes.data.id }),
      ]);
      if (tiersRes.error) throw tiersRes.error;
      return {
        kind: 'ok',
        course: courseRes.data,
        sessions: (sessionRows ?? []) as CourseSession[],
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
  const error =
    detailQuery.isError || detailQuery.data?.kind === 'not-found'
      ? 'Kurset finnes ikke eller er ikke tilgjengelig.'
      : null;

  useDocumentTitle(course?.title);

  // Back link: prefer the viewing storefront (state) over the canonical
  // owner. Direct-link visitors get the owner.
  const backHref = navState?.fromSlug
    ? `/${navState.fromSlug}`
    : course?.seller?.slug
      ? `/${course.seller.slug}`
      : '/';
  const backLabel = navState?.fromName ?? course?.seller?.name ?? null;
  const nextSessionDate = course
    ? resolveNextSessionDate(sessions) ?? course.start_date
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="flex w-full items-center justify-center px-4 py-8 sm:px-6">
        <Link to={`/${slug}`} className="flex select-none items-center">
          <span className="text-base font-medium text-foreground">Openspot</span>
        </Link>
      </header>

      <main className="flex-1">
        {loading && <CourseDetailSkeleton />}

        {error && !loading && <PageState variant="public-course" />}

        {!loading && !error && course && (
          <div className="mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8 pb-16 animate-in fade-in duration-150">
            {backLabel && (
              <Link
                to={backHref}
                className="mb-8 inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
              >
                <ChevronLeft className="size-4" strokeWidth={1.75} />
                {backLabel}
              </Link>
            )}

            <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:gap-6 md:items-start lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
              <div className="space-y-8 max-w-[640px] min-w-0">
                <div className="space-y-6">
                  <CourseImage course={course} />
                  <CourseHeader
                    course={course}
                    nextSessionDate={nextSessionDate}
                    sessions={sessions}
                  />
                </div>
                {course.description && (
                  <section className="border-t border-border pt-8">
                    <p className="mb-2 text-sm font-medium text-foreground">
                      Om kurset
                    </p>
                    <RichTextContent
                      html={course.description}
                      className="text-base leading-relaxed text-foreground"
                    />
                  </section>
                )}
                {course.location && (
                  <section>
                    <LocationCard
                      location={course.location}
                      lat={course.location_lat}
                      lon={course.location_lon}
                      placeId={course.location_place_id}
                    />
                  </section>
                )}
                {course.seller && <ArrangorSection seller={course.seller} />}
              </div>

              <aside>
                <div className="md:sticky md:top-10">
                  <BookingRailLite
                    course={course}
                    tiers={tiers}
                    studioSlug={slug || ''}
                    dropInSublabel={buildDropInSublabel(sessions)}
                    metaLabel={buildCardMeta(course, nextSessionDate)}
                  />
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

/** Who you're booking with — the seller of record. Quiet identity block in
 * the Eventbrite "By X" tradition: avatar + name linking to the arrangør's
 * own storefront. Org number and contact details live on the receipt, not
 * here — the page brand carries the identity. */
function ArrangorSection({ seller }: { seller: NonNullable<PublicCourseWithDetails['seller']> }) {
  return (
    <section className="border-t border-border pt-8">
      <p className="mb-3 text-sm font-medium text-foreground">Arrangør</p>
      {seller.slug ? (
        <Link
          to={`/${seller.slug}`}
          className="group inline-flex max-w-full items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <UserAvatar size="lg" name={seller.name} src={seller.logo_url} className="shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-base font-medium text-foreground underline-offset-4 transition-colors group-hover:underline">
              {seller.name}
            </span>
            <span className="block text-sm text-foreground-muted">Se alle kurs</span>
          </span>
        </Link>
      ) : (
        <div className="inline-flex max-w-full items-center gap-3">
          <UserAvatar size="lg" name={seller.name} src={seller.logo_url} className="shrink-0" />
          <span className="min-w-0 truncate text-base font-medium text-foreground">
            {seller.name}
          </span>
        </div>
      )}
    </section>
  );
}

function CourseImage({ course }: { course: PublicCourseWithDetails }) {
  const img = resolveCourseImage(course);
  if (!img) return null;
  return (
    <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
      <img src={img} alt="" className="size-full object-cover" />
    </div>
  );
}

function CourseHeader({
  course,
  nextSessionDate,
  sessions,
}: {
  course: PublicCourseWithDetails;
  nextSessionDate: string | null;
  sessions: CourseSession[];
}) {
  return (
    <header className="space-y-3">
      <h1 className="text-3xl font-medium text-foreground">
        {course.title}
      </h1>
      <MetaStrip course={course} nextSessionDate={nextSessionDate} sessions={sessions} />
    </header>
  );
}

function MetaStrip({
  course,
  nextSessionDate,
  sessions,
}: {
  course: PublicCourseWithDetails;
  nextSessionDate: string | null;
  sessions: CourseSession[];
}) {
  const timeRange = resolveTimeRange(course.time_schedule, course.duration);
  const nextDateLabel = formatRelativeDate(nextSessionDate);

  const instructor = course.instructors[0] ?? course.instructor ?? null;
  // Show the schedule dialog for series AND for multi-day single courses.
  const showScheduleLink = sessions.length > 1;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-base text-foreground-muted">
      {nextDateLabel && (
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="size-3.5" strokeWidth={1.75} />
          {nextDateLabel}
          {showScheduleLink && (
            <>
              <span aria-hidden className="mx-1 h-3 w-px bg-border-subtle" />
              <SchedulePeek sessions={sessions} duration={course.duration} />
            </>
          )}
        </span>
      )}
      {timeRange && (
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Clock className="size-3.5" strokeWidth={1.75} />
          {timeRange}
        </span>
      )}
      {instructor?.name && (
        <span className="inline-flex items-center gap-2">
          <UserAvatar
            size="xs"
            name={instructor.name}
            className="shrink-0"
          />
          <span>{instructor.name}</span>
        </span>
      )}
    </div>
  );
}

function SchedulePeek({ sessions, duration }: { sessions: CourseSession[]; duration: number | null }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="underline decoration-foreground-disabled underline-offset-2 hover:text-foreground hover:decoration-foreground transition-colors"
      >
        Se alle datoer
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Kurskalender</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2.5">
            {sessions.map((s) => {
              const isPast = hasSessionFinished(s, duration);
              const isCancelled = s.status === 'cancelled';
              const timeRange = s.start_time
                ? sessionTimeRangeWithEndTime(s.start_time, s.end_time, duration)
                : null;
              return (
                <li
                  key={s.id}
                  className={cn(
                    'rounded-xl border border-card bg-surface px-4 py-3.5',
                    isPast && !isCancelled && 'opacity-60',
                  )}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <h3
                      className={cn(
                        'text-base font-medium text-foreground capitalize',
                        isCancelled && 'line-through text-foreground-muted',
                      )}
                    >
                      {formatFullDate(s.session_date)}
                    </h3>
                    {timeRange && (
                      <span
                        className={cn(
                          'text-base tabular-nums text-foreground-muted whitespace-nowrap',
                          isCancelled && 'line-through',
                        )}
                      >
                        {timeRange}
                      </span>
                    )}
                  </div>
                  {(s.notes || isCancelled) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-foreground-muted">
                      {isCancelled && (
                        <Badge variant="warning" shape="pill" size="sm">
                          Avlyst
                        </Badge>
                      )}
                      {s.notes && <span>{s.notes}</span>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Build a `kl. HH:MM–HH:MM` (or just `HH:MM`) label for a session tile.
 *
 * Priority:
 * 1. If the session has an explicit `end_time`, use it → `start–end`.
 * 2. Otherwise fall back to `start + durationMinutes` (legacy series behaviour).
 * 3. If neither, just return the start time.
 */
function sessionTimeRangeWithEndTime(
  startTime: string,
  endTime: string | null | undefined,
  durationMinutes: number | null,
): string {
  const start = startTime.slice(0, 5);
  if (endTime) return `${start}–${endTime.slice(0, 5)}`;
  if (!durationMinutes || durationMinutes <= 0) return start;
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + durationMinutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${start}–${pad(endH)}:${pad(endM)}`;
}

function CourseDetailSkeleton() {
  return (
    <div
      className="mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8 pb-16 animate-in fade-in duration-150"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Laster…</span>
      <Skeleton className="h-4 w-32 mb-8" />
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        <div className="space-y-8 max-w-[640px] min-w-0">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="hidden md:block h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'] as const;
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'] as const;

function extractTime(timeSchedule: string | null): string {
  if (!timeSchedule) return '';
  const m = timeSchedule.match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : '';
}

/** Time range for the meta strip. Prefers a real "HH:MM-HH:MM" in
 * time_schedule; otherwise derives the end time from start + duration
 * minutes so the meta strip always shows the full window. */
function resolveTimeRange(timeSchedule: string | null, durationMinutes: number | null): string {
  if (!timeSchedule) return '';
  const rangeMatch = timeSchedule.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  if (rangeMatch) return `${rangeMatch[1]}–${rangeMatch[2]}`;
  const start = extractTime(timeSchedule);
  if (!start || !durationMinutes || durationMinutes <= 0) return start;
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + durationMinutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${start}–${pad(endH)}:${pad(endM)}`;
}

/** "I dag"/"I morgen" relative to Oslo's today — session dates are naive
 * Norwegian dates, so the viewer's own timezone must not shift the label. */
function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const key = dateStr.slice(0, 10);
  const today = osloTodayKey();
  if (key === today) return 'I dag';
  if (key === nextDayKey(today)) return 'I morgen';
  const d = toLocalDate(key);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

/** YYYY-MM-DD of the day after `dateKey` (pure calendar arithmetic in UTC). */
function nextDayKey(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function formatFullDate(dateStr: string): string {
  // toLocalDate: `new Date('YYYY-MM-DD')` parses as UTC midnight, showing the
  // wrong weekday for any viewer in a timezone west of UTC.
  const d = toLocalDate(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

function buildCardMeta(course: PublicCourseWithDetails, nextSessionDate: string | null): string | null {
  const dateLabel = formatRelativeDate(nextSessionDate);
  const timeRange = resolveTimeRange(course.time_schedule, course.duration);
  if (dateLabel && timeRange) return `${dateLabel} · ${timeRange}`;
  return dateLabel || timeRange || null;
}

/** "YYYY-MM-DD HH:mm:ss" end-of-session key, lexically comparable against
 * `osloNowKey()`. Prefers the explicit `end_time` column, else start +
 * duration. The Z-suffixed parse is pure calendar arithmetic — the viewer's
 * timezone never shifts the result. Null when the session has no times. */
function sessionEndKey(s: CourseSession, durationMinutes: number | null): string | null {
  if (s.end_time) return `${s.session_date} ${s.end_time}`;
  if (!s.start_time) return null;
  const start = new Date(`${s.session_date}T${s.start_time}Z`);
  if (isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + (durationMinutes ?? 60) * 60000).toISOString();
  return `${end.slice(0, 10)} ${end.slice(11, 19)}`;
}

/** A session is "finished" once its end has passed (in Oslo time), so a class
 * that's underway isn't dimmed yet. Without any time we can only judge by the
 * calendar day. Display-only — bookability comes from the tier RPC. */
function hasSessionFinished(s: CourseSession, durationMinutes: number | null): boolean {
  const endKey = sessionEndKey(s, durationMinutes);
  if (!endKey) return s.session_date < osloTodayKey();
  return endKey <= osloNowKey();
}

/** First non-cancelled session whose start instant is still ahead in Oslo
 * time. "Today's session at 06:45" is no longer upcoming once the clock
 * passes 06:45 — we skip to the next one. Same comparison checkout uses to
 * auto-pick the drop-in class, so the sublabel names the session that gets
 * booked. */
function findNextUpcomingSession(sessions: CourseSession[]): CourseSession | null {
  const now = osloNowKey();
  for (const s of sessions) {
    if (s.status === 'cancelled') continue;
    if (`${s.session_date} ${s.start_time ?? '23:59:59'}` > now) return s;
  }
  return null;
}

function resolveNextSessionDate(sessions: CourseSession[]): string | null {
  return findNextUpcomingSession(sessions)?.session_date ?? null;
}

function buildDropInSublabel(sessions: CourseSession[]): string | null {
  const next = findNextUpcomingSession(sessions);
  if (!next) return null;
  const dateLabel = formatRelativeDate(next.session_date);
  const time = next.start_time ? next.start_time.slice(0, 5) : null;
  if (dateLabel && time) return `${dateLabel} · ${time}`;
  return dateLabel || time || null;
}
