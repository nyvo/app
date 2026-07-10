import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { DateBadge } from '@/components/ui/date-badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RichTextContent } from '@/components/ui/rich-text-content';
import { LocationCard } from '@/components/public/course-details/LocationCard';
import type { TicketTile } from '@/components/public/course-details/BookingRailLite';
import {
  buildFactBandWhen,
  capitalize,
  formatFullDate,
  formatShortWeekdayDate,
  hasSessionFinished,
  sessionTimeRangeWithEndTime,
} from '@/components/public/course-details/schedule-format';
import { cn, formatCoursePrice, formatKroner } from '@/lib/utils';
import { resolveCourseImage, type PublicCourseWithDetails } from '@/services/publicCourses';
import type { CourseSession } from '@/types/database';

const MAX_VISIBLE_SESSIONS = 4;

interface CourseDetailContentProps {
  course: PublicCourseWithDetails;
  sessions: CourseSession[];
  /** Sellable tiles from `getBookingTiles` — main first, then drop-in. */
  tiles: TicketTile[];
  courseFull: boolean;
  soldOut: boolean;
  closed: boolean;
  spotsLeft: number;
  lowStock: boolean;
  /** /:slug/:courseSlug/pamelding — no `?billett=`, tier choice now lives on checkout. */
  checkoutHref: string;
  backHref: string;
}

/**
 * T1 "Magasin" course-detail presentation — a single centered column: hero,
 * title, fact band, one elevated booking card, Om kurset, Timeplan, Sted.
 * Pure/presentational (no data fetching) so both `PublicCourseDetailPage`
 * and `DetailT1Preview` render the exact same markup off supplied props —
 * one source of truth, no drift between the real page and its dev preview.
 */
export function CourseDetailContent({
  course,
  sessions,
  tiles,
  courseFull,
  soldOut,
  closed,
  spotsLeft,
  lowStock,
  checkoutHref,
  backHref,
}: CourseDetailContentProps) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const paymentNotReady = tiles.some((t) => t.amount > 0) && !course.seller?.stripe_onboarding_complete;

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pb-28 sm:px-6 md:pb-16 animate-in fade-in duration-150">
      <Link
        to={backHref}
        className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} />
        Tilbake til kursoversikten
      </Link>

      <CourseImage course={course} />

      <h1 className="mt-7 text-4xl font-medium tracking-tight leading-[1.08] text-foreground">
        {course.title}
      </h1>

      <FactBand course={course} sessions={sessions} />

      <div className="mt-[26px]">
        <BookingCard
          course={course}
          tiles={tiles}
          courseFull={courseFull}
          soldOut={soldOut}
          closed={closed}
          paymentNotReady={paymentNotReady}
          lowStock={lowStock}
          spotsLeft={spotsLeft}
          checkoutHref={checkoutHref}
        />
      </div>

      {course.description && (
        <section className="mt-8">
          <h2 className="text-base font-medium text-foreground">Om kurset</h2>
          <RichTextContent
            html={course.description}
            className="mt-2.5 text-base leading-relaxed text-foreground"
          />
        </section>
      )}

      {sessions.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-medium text-foreground">Timeplan</h2>
          <TimeplanStrip
            sessions={sessions}
            duration={course.duration}
            onOpenSchedule={() => setScheduleOpen(true)}
          />
        </section>
      )}

      {course.location && (
        <section className="mt-8">
          <h2 className="text-base font-medium text-foreground">Sted</h2>
          <div className="mt-2.5">
            <LocationCard
              location={course.location}
              lat={course.location_lat}
              lon={course.location_lon}
              placeId={course.location_place_id}
            />
          </div>
        </section>
      )}

      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        sessions={sessions}
        duration={course.duration}
      />
    </div>
  );
}

// ── Hero image ──────────────────────────────────────────────────────────

function CourseImage({ course }: { course: PublicCourseWithDetails }) {
  const img = resolveCourseImage(course);
  // A broken image URL falls back to the same no-image branch (render
  // nothing) rather than leaving a broken-image glyph in the hero — the T1
  // layout has no placeholder state, it simply starts at the title.
  const [failed, setFailed] = useState(false);
  if (!img || failed) return null;
  return (
    <div className="mt-7 aspect-[21/9] w-full overflow-hidden rounded-2xl bg-muted">
      <img
        src={img}
        alt=""
        className="size-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

// ── Fact band ───────────────────────────────────────────────────────────

function FactBand({ course, sessions }: { course: PublicCourseWithDetails; sessions: CourseSession[] }) {
  const when = buildFactBandWhen(course, sessions.length);
  const instructorName = course.instructor_name;

  return (
    <div className="@container mt-[22px]">
      <div
        className={cn(
          'grid grid-cols-1 border-t border-b border-border-subtle',
          instructorName && '@[480px]:grid-cols-2',
        )}
      >
        <div className={cn('flex min-w-0 items-center gap-3 py-3.5', instructorName && '@[480px]:pr-6')}>
          <DateBadge dateStr={course.start_date ?? undefined} size="sm" />
          <p className="text-[14.5px] font-medium leading-snug text-foreground">
            {when.bold}
            {when.sub && (
              <span className="mt-0.5 block text-[13px] font-normal text-foreground-muted">
                {when.sub}
              </span>
            )}
          </p>
        </div>
        {instructorName && (
          <div className="flex min-w-0 items-center gap-3 border-t border-border-subtle py-3.5 @[480px]:border-t-0 @[480px]:border-l @[480px]:pl-6">
            <UserAvatar size="lg" name={instructorName} className="shrink-0" />
            <p className="text-[14.5px] font-medium leading-snug text-foreground">
              {instructorName}
              <span className="mt-0.5 block text-[13px] font-normal text-foreground-muted">
                Instruktør
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Booking card — the page's one elevated surface ─────────────────────

function BookingCard({
  course,
  tiles,
  courseFull,
  soldOut,
  closed,
  paymentNotReady,
  lowStock,
  spotsLeft,
  checkoutHref,
}: {
  course: PublicCourseWithDetails;
  tiles: TicketTile[];
  courseFull: boolean;
  soldOut: boolean;
  closed: boolean;
  paymentNotReady: boolean;
  lowStock: boolean;
  spotsLeft: number;
  checkoutHref: string;
}) {
  const sellerName = course.seller?.name ?? null;
  const sellerSlug = course.seller?.slug ?? null;
  const showControls = !soldOut && !closed;

  return (
    <div>
      <div className="relative rounded-xl border border-border-subtle bg-background p-5 shadow-soft">
        {lowStock && (
          <span className="absolute -top-3 right-5 rounded-xl border border-border-subtle bg-background px-3 py-0.5 text-[13px] text-warning">
            {spotsLeft} {spotsLeft === 1 ? 'plass' : 'plasser'} igjen
          </span>
        )}
        <div className="flex items-center justify-between gap-5">
          {soldOut ? (
            <p className="text-base font-medium text-foreground-muted">Kurset er fullt</p>
          ) : closed ? (
            <div>
              <p className="text-base font-medium text-foreground">Påmelding stengt</p>
              <p className="text-sm text-foreground-muted">Kurset har startet.</p>
            </div>
          ) : (
            <div className="min-w-0 space-y-1.5">
              {/* The package tile was withheld because the course is full,
                  but drop-in is still open — say why the package is
                  missing (steady state of a running drop-in series). */}
              {courseFull && (
                <p className="text-sm text-foreground-muted">Kurspakken er full.</p>
              )}
              <PriceGrid tiles={tiles} course={course} />
            </div>
          )}

          {showControls && (
            paymentNotReady ? (
              <span className="shrink-0 text-sm text-foreground-muted">Påmelding åpner snart.</span>
            ) : (
              <Button asChild size="cta" className="shrink-0">
                <Link to={checkoutHref}>Meld deg på</Link>
              </Button>
            )
          )}
        </div>
      </div>
      {soldOut && sellerName && sellerSlug && (
        <Link
          to={`/${sellerSlug}`}
          className="mt-3 block text-center text-sm text-foreground-muted underline decoration-foreground-disabled underline-offset-2 hover:text-foreground hover:decoration-foreground transition-colors"
        >
          Se andre kurs fra {sellerName}
        </Link>
      )}
    </div>
  );
}

/** One row per tile — muted label, right-aligned price. A prorated main
 * tile shows the original price struck through, to the left of the new
 * price ("was → now", the standard order). */
function PriceGrid({ tiles, course }: { tiles: TicketTile[]; course: PublicCourseWithDetails }) {
  return (
    <div className="grid grid-cols-[auto_auto] items-baseline gap-x-7 gap-y-1.5">
      {tiles.map((tile) => (
        <Fragment key={tile.id}>
          <span className="text-sm text-foreground-muted">{tile.label}</span>
          <span className="text-right text-[15px] font-medium tabular-nums text-foreground">
            {tile.id === 'main' && tile.prorated && (
              <s className="mr-2 text-[13.5px] font-normal text-foreground/40">
                {formatKroner(course.price)}
              </s>
            )}
            {formatCoursePrice(tile.amount)}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

// ── Timeplan — flickable strip of date cards ─────────────────────────────

function TimeplanStrip({
  sessions,
  duration,
  onOpenSchedule,
}: {
  sessions: CourseSession[];
  duration: number | null;
  onOpenSchedule: () => void;
}) {
  const visible = sessions.slice(0, MAX_VISIBLE_SESSIONS);
  const hiddenCount = sessions.length - visible.length;

  return (
    <div className="mt-2.5 flex gap-2.5 overflow-x-auto pb-1">
      {visible.map((s, i) => (
        <SessionCard key={s.id} session={s} index={i} duration={duration} />
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={onOpenSchedule}
          className="flex min-w-[104px] shrink-0 items-center justify-center rounded-xl border border-dashed border-border-subtle px-3.5 py-3 text-sm text-foreground-muted hover:text-foreground hover:border-border transition-colors"
        >
          + {hiddenCount} økter
        </button>
      )}
    </div>
  );
}

function SessionCard({
  session,
  index,
  duration,
}: {
  session: CourseSession;
  index: number;
  duration: number | null;
}) {
  const isCancelled = session.status === 'cancelled';
  const isPast = !isCancelled && hasSessionFinished(session, duration);
  const timeRange = session.start_time
    ? sessionTimeRangeWithEndTime(session.start_time, session.end_time, duration)
    : null;
  const dateLabel = capitalize(formatShortWeekdayDate(session.session_date));

  return (
    <div
      className={cn(
        'min-w-[104px] shrink-0 rounded-xl border border-border-subtle px-3.5 py-3',
        (isPast || isCancelled) && 'opacity-55',
      )}
    >
      <span className="block text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
        Økt {index + 1}
      </span>
      <p
        className={cn(
          'mt-[3px] text-[15px] font-medium text-foreground',
          (isPast || isCancelled) && 'line-through',
        )}
      >
        {dateLabel}
      </p>
      {isCancelled ? (
        <Badge variant="warning" shape="pill" size="sm" className="mt-1">
          Avlyst
        </Badge>
      ) : (
        <span className="mt-px block text-[13px] tabular-nums text-foreground-muted">
          {isPast ? 'Holdt' : timeRange}
        </span>
      )}
    </div>
  );
}

// ── Schedule dialog — "Se alle datoer" ────────────────────────────────────

function ScheduleDialog({
  open,
  onOpenChange,
  sessions,
  duration,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: CourseSession[];
  duration: number | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                  'rounded-xl bg-panel px-4 py-3',
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
  );
}
