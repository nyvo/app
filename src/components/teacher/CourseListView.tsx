import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users } from '@/lib/icons';
import { formatKroner } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, type CourseStatus } from '@/components/ui/status-badge';
import { MONTHS_SHORT } from '@/lib/calendar-nb';
import type { SessionScheduleRow } from '@/services/courses';
import type { CourseFormat, DeliveryMode } from '@/types/database';
import { routes } from '@/lib/routes';

/**
 * "Mine kurs" list — filled row cards (2026-07-19 direction, replacing the
 * sortable table). Each course is one rounded bg-muted card: image, title
 * with an inline status pill, icon-metadata (next session, location,
 * påmeldte), price at the far edge. Luma's row anatomy on the repo's
 * "item directly on the white page" recipe (bg-muted fill, hover:bg-pressed,
 * full text-foreground inside — docs/design-language.md § Cards).
 *
 * Column-header sorting was dropped WITH the table: the page default-sorts
 * by next session (drafts last), and search + tabs cover retrieval at
 * realistic catalog sizes. If sorting returns, it comes back as a compact
 * control, not a header row.
 */

/** Course-type label — shown in the date slot only for drafts, which have
 * no sessions yet. Dated rows lead with the concrete next session instead. */
const TYPE_LABEL: Record<'series' | 'single' | 'online', string> = {
  series: 'Kursrekke',
  single: 'Enkelttime',
  online: 'Nettkurs',
};

function typeLabel(format: CourseFormat, delivery: DeliveryMode): string {
  if (delivery === 'online') return TYPE_LABEL.online;
  return TYPE_LABEL[format] ?? TYPE_LABEL.single;
}

// Short weekday, checkout convention ("tir. 12. aug"). Deliberately local —
// the codebase keeps short-weekday arrays per-module (see @/lib/calendar-nb's
// note on incompatible abbreviation conventions).
const WEEKDAYS_SHORT = ['søn.', 'man.', 'tir.', 'ons.', 'tor.', 'fre.', 'lør.'] as const;

function formatRowDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return null;
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

/**
 * Publish-state badge — silent on the healthy states (upcoming/active, i.e.
 * Publisert); only renders for states the teacher might need to notice.
 * Sits inline beside the title, so healthy rows carry no pill at all.
 *
 * `isFull` is a derived capacity state (signups ≥ capacity), not a
 * course_status value — for the teacher a fully booked course is a win, so
 * it renders as a success badge rather than a warning. Publish-state badges
 * take precedence (a cancelled-but-full course reads Avlyst).
 */
function StatusBadgeRow({ courseStatus, isFull }: { courseStatus: string; isFull?: boolean }) {
  if (courseStatus === 'draft' || courseStatus === 'cancelled' || courseStatus === 'completed') {
    return <StatusBadge status={courseStatus as CourseStatus} className="shrink-0" />;
  }
  if (isFull) {
    return (
      <Badge variant="success" shape="pill" size="sm" role="status" aria-label="Status: Fullt" className="shrink-0">
        Fullt
      </Badge>
    );
  }
  return null;
}

/** 64px course image — course image → seller default → white inset square
 * (the card itself is bg-muted, so the empty state inverts to bg-surface). */
function CourseThumb({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <div aria-hidden className="size-16 shrink-0 rounded-lg bg-surface" />;
  }
  return (
    <img
      src={src}
      alt=""
      className="media-outline size-16 shrink-0 rounded-lg object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function CourseRowCard({
  course,
  countsUnavailable,
  fallbackImageUrl,
}: {
  course: SessionScheduleRow;
  countsUnavailable?: boolean;
  fallbackImageUrl?: string | null;
}) {
  const date = formatRowDate(course.sessionDate);
  const isFull =
    !countsUnavailable &&
    !!course.maxParticipants &&
    course.signupsCount >= course.maxParticipants;
  // Counts RPC failed — render `–` rather than a fabricated 0 / N.
  const roster = countsUnavailable
    ? '–'
    : course.maxParticipants
      ? `${course.signupsCount} / ${course.maxParticipants} påmeldte`
      : `${course.signupsCount} påmeldte`;

  return (
    <li>
      <Link
        to={routes.course(course.courseId)}
        className="flex items-center gap-4 rounded-xl bg-muted p-4 no-underline transition-colors hover:bg-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CourseThumb src={course.imageUrl || fallbackImageUrl || null} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-base font-medium text-foreground">{course.courseTitle}</h3>
            <StatusBadgeRow courseStatus={course.courseStatus} isFull={isFull} />
          </div>
          {/* Metadata = icon+text pairs, full text-foreground on the muted
              fill (never muted-on-muted). One "·" pairs date and time. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Calendar aria-hidden className="size-4 shrink-0" />
              {date
                ? course.startTime
                  ? `${date} · ${course.startTime}`
                  : date
                : typeLabel(course.courseFormat, course.deliveryMode)}
            </span>
            {course.location && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin aria-hidden className="size-4 shrink-0" />
                <span className="truncate">{course.location}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums">
              <Users aria-hidden className="size-4 shrink-0" />
              {roster}
            </span>
          </div>
        </div>
        <span className="hidden shrink-0 text-base text-foreground tabular-nums sm:inline">
          {formatKroner(course.price)}
        </span>
      </Link>
    </li>
  );
}

// ─── Public component ───────────────────────────────────────────────────

interface CourseListViewProps {
  courses: SessionScheduleRow[];
  /** Rendered in place of the list when `courses` is empty. */
  emptyState?: ReactNode;
  /** When the signup-counts RPC failed, påmeldte reads `–`. */
  countsUnavailable?: boolean;
  /** Seller-level default course image — thumb fallback when a course has no
   * image of its own, mirroring the public storefront's fallback chain. */
  fallbackImageUrl?: string | null;
}

export function CourseListView({ courses, emptyState, countsUnavailable, fallbackImageUrl }: CourseListViewProps) {
  if (courses.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {courses.map((c) => (
        <CourseRowCard
          key={c.sessionId}
          course={c}
          countsUnavailable={countsUnavailable}
          fallbackImageUrl={fallbackImageUrl}
        />
      ))}
    </ul>
  );
}

/** Mirrors the row-card stack exactly: p-4 card + 64px thumb → 96px tall. */
export function CourseListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
