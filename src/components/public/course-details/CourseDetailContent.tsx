import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RichTextContent } from '@/components/ui/rich-text-content';
import { LocationCard } from '@/components/public/course-details/LocationCard';
import {
  buildMetaCardRows,
  capitalize,
  formatFullDate,
  formatShortWeekdayDate,
  hasSessionFinished,
  sessionTimeRangeWithEndTime,
} from '@/components/public/course-details/schedule-format';
import { cn } from '@/lib/utils';
import { resolveCourseImage, type PublicCourseWithDetails } from '@/services/publicCourses';
import type { CourseSession } from '@/types/database';

const MAX_VISIBLE_SESSIONS = 4;

interface CourseDetailContentProps {
  course: PublicCourseWithDetails;
  sessions: CourseSession[];
  backHref: string;
}

/**
 * T1 "Magasin" course-detail presentation — a single centered column: hero,
 * title, metadata card, Om kurset, Timeplan, Sted. The booking surface lives
 * outside this component, in the persistent `BookingBar` the page renders
 * alongside it — pure/presentational (no data fetching) so both
 * `PublicCourseDetailPage` and `DetailT1Preview` render the exact same
 * markup off supplied props — one source of truth, no drift between the real
 * page and its dev preview.
 */
export function CourseDetailContent({ course, sessions, backHref }: CourseDetailContentProps) {
  const [scheduleOpen, setScheduleOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pb-28 sm:px-6 animate-in fade-in duration-150">
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

      <MetadataCard course={course} sessions={sessions} />

      {course.description && (
        <section className="mt-8">
          <h2 className="text-base font-medium text-foreground">Om kurset</h2>
          <RichTextContent
            html={course.description}
            className="mt-2.5 text-base leading-relaxed text-foreground"
          />
        </section>
      )}

      {/* One session = the metadata card's Start/Tid rows already say
          everything a Timeplan card would repeat. Multi-day courses (series
          or multi-day workshops) still list their økter. */}
      {sessions.length > 1 && (
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

// ── Metadata card — Start / Tid / Varighet / Instruktør ──────────────────

function MetadataCard({ course, sessions }: { course: PublicCourseWithDetails; sessions: CourseSession[] }) {
  const rows = buildMetaCardRows(course, sessions.length);
  if (rows.length === 0) return null;

  return (
    <div className="mt-[22px] rounded-xl border border-border-subtle divide-y divide-border-subtle">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4 px-4 py-3">
          <span className="text-sm text-foreground-muted whitespace-nowrap">{row.label}</span>
          <span className="text-sm font-medium text-foreground text-right">{row.value}</span>
        </div>
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
  // Once sessions have been held, the first upcoming card's eyebrow swaps
  // to «Neste økt» — same slot, one string, so drop-in buyers see exactly
  // which session they'd be joining.
  const anyHeld = sessions.some(
    (x) => x.status !== 'cancelled' && hasSessionFinished(x, duration),
  );
  const nextId = anyHeld
    ? sessions.find((x) => x.status !== 'cancelled' && !hasSessionFinished(x, duration))?.id ?? null
    : null;

  return (
    <div className="mt-2.5 flex gap-2.5 overflow-x-auto pb-1">
      {visible.map((s, i) => (
        <SessionCard key={s.id} session={s} index={i} duration={duration} isNext={s.id === nextId} />
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={onOpenSchedule}
          className="flex min-w-[104px] shrink-0 items-center justify-center rounded-xl border border-dashed border-border-subtle px-3.5 py-3 text-sm text-foreground-muted hover:text-foreground hover:border-border transition-colors"
        >
          + {hiddenCount} {hiddenCount === 1 ? 'økt' : 'økter'}
        </button>
      )}
    </div>
  );
}

function SessionCard({
  session,
  index,
  duration,
  isNext = false,
}: {
  session: CourseSession;
  index: number;
  duration: number | null;
  isNext?: boolean;
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
        {isNext ? 'Neste økt' : `Økt ${index + 1}`}
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
          {isPast ? 'Gjennomført' : timeRange}
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
