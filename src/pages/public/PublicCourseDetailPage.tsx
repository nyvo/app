import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Clock, Calendar, ChevronLeft } from '@/lib/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { toLocalDate } from '@/utils/dateUtils';
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
import type { CourseSession } from '@/types/database';

interface DetailNavState {
  fromSlug?: string;
  fromName?: string | null;
}

export default function PublicCourseDetailPage() {
  const { slug, courseSlug } = useParams<{ slug: string; courseSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state ?? null) as DetailNavState | null;

  const [course, setCourse] = useState<PublicCourseWithDetails | null>(null);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!slug || !courseSlug) return;
      setLoading(true);
      setError(null);

      // If the team-slug segment is an archived alias, redirect to the
      // canonical storefront URL first — the course lookup below scopes to a
      // current team slug, so passing the alias through would 404. The effect
      // re-runs after the redirect.
      const sellerLookup = await fetchSellerBySlug(slug);
      if (!active) return;
      if (sellerLookup.data && sellerLookup.data.slug !== slug) {
        navigate(`/${sellerLookup.data.slug}/${courseSlug}`, { replace: true, state: location.state });
        return;
      }

      const courseRes = await fetchPublicCourseBySlug(slug, courseSlug);
      if (!active) return;
      if (courseRes.error || !courseRes.data) {
        setError('Kurset finnes ikke eller er ikke tilgjengelig.');
        setLoading(false);
        return;
      }

      // Canonical URL = owner's team slug. If the visitor landed via a
      // venue's storefront (syndicated affiliation), redirect to the
      // owner's URL so payment flows attach to the correct seller. The
      // back-link still resolves via `state.fromSlug` to where the user
      // came from — payment context and navigation context can differ.
      const ownerSlug = courseRes.data.seller?.slug;
      if (ownerSlug && ownerSlug !== slug) {
        navigate(`/${ownerSlug}/${courseSlug}`, { replace: true, state: location.state });
        return;
      }

      setCourse(courseRes.data);

      const { data: sessionRows } = await supabase
        .from('course_sessions')
        .select('*')
        .eq('course_id', courseRes.data.id)
        .order('session_date', { ascending: true });
      if (!active) return;
      setSessions((sessionRows ?? []) as CourseSession[]);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [slug, courseSlug, navigate, location.state]);

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
        <Link to="/" className="flex select-none items-center">
          <span className="text-base font-medium text-foreground">Openspot</span>
        </Link>
      </header>

      <main className="flex-1">
        {loading && <CourseDetailSkeleton />}

        {error && !loading && <PageState variant="public-course" />}

        {!loading && !error && course && (
          <div className="mx-auto max-w-[1100px] w-full px-4 sm:px-6 lg:px-8 pb-16 animate-in fade-in duration-150">
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
                    <p className="mb-2 text-sm font-medium text-foreground-muted">
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
              </div>

              <aside>
                <div className="md:sticky md:top-10">
                  <BookingRailLite
                    course={course}
                    studioSlug={slug || ''}
                    dropInSublabel={course.allows_drop_in ? buildDropInSublabel(sessions) : null}
                    metaLabel={buildCardMeta(course, nextSessionDate)}
                    seriesStarted={course.format === 'series' && hasSeriesStarted(sessions, course.duration)}
                    remainingSessions={countRemainingSessions(sessions, course.duration)}
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
      <h1 className="text-3xl font-medium tracking-tight text-foreground">
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
  const showScheduleLink = course.format === 'series' && sessions.length > 1;

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
  const today = new Date().toISOString().slice(0, 10);

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
              const isPast = s.session_date < today;
              const isCancelled = s.status === 'cancelled';
              const timeRange = s.start_time
                ? sessionTimeRange(s.start_time, duration)
                : null;
              return (
                <li
                  key={s.id}
                  className={cn(
                    'rounded-xl border border-border bg-surface px-4 py-3.5',
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

function sessionTimeRange(startTime: string, durationMinutes: number | null): string {
  const start = startTime.slice(0, 5);
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
      className="mx-auto max-w-[1100px] w-full px-4 sm:px-6 lg:px-8 pb-16 animate-in fade-in duration-150"
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

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = toLocalDate(dateStr);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'I dag';
  if (diff === 1) return 'I morgen';
  return `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

function buildCardMeta(course: PublicCourseWithDetails, nextSessionDate: string | null): string | null {
  const dateLabel = formatRelativeDate(nextSessionDate);
  const timeRange = resolveTimeRange(course.time_schedule, course.duration);
  if (dateLabel && timeRange) return `${dateLabel} · ${timeRange}`;
  return dateLabel || timeRange || null;
}

/** A session is "remaining" when it isn't cancelled and hasn't ended yet —
 * a class that's underway but not over still counts. Mirrors the SQL in
 * `available_ticket_types` (migration 20260520160000) so the prorated price
 * shown on the booking card matches what the RPC charges at checkout. */
function isSessionRemaining(s: CourseSession, durationMinutes: number | null): boolean {
  if (s.status === 'cancelled') return false;
  const startIso = `${s.session_date}T${s.start_time ?? '00:00:00'}`;
  const startMs = new Date(startIso).getTime();
  if (isNaN(startMs)) return false;
  const endMs = startMs + (durationMinutes ?? 60) * 60000;
  return endMs > Date.now();
}

/** Series counts as "started" once the first non-cancelled session's end
 * time has passed. After that the package is offered at a prorated price
 * for the remaining sessions instead of being hidden. */
function hasSeriesStarted(sessions: CourseSession[], durationMinutes: number | null): boolean {
  const first = sessions.find((s) => s.status !== 'cancelled');
  if (!first) return false;
  return !isSessionRemaining(first, durationMinutes);
}

function countRemainingSessions(sessions: CourseSession[], durationMinutes: number | null): number {
  return sessions.reduce((n, s) => (isSessionRemaining(s, durationMinutes) ? n + 1 : n), 0);
}

/** First non-cancelled session whose start instant is still in the future.
 * "Today's session at 06:45" is no longer upcoming once the clock passes
 * 06:45 — we skip to the next one. */
function findNextUpcomingSession(sessions: CourseSession[]): CourseSession | null {
  const now = Date.now();
  for (const s of sessions) {
    if (s.status === 'cancelled') continue;
    const startIso = `${s.session_date}T${s.start_time ?? '23:59:59'}`;
    const t = new Date(startIso).getTime();
    if (!isNaN(t) && t > now) return s;
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
