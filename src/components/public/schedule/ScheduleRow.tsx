import { Link, useLocation } from 'react-router-dom';
import { MapPin, User } from '@/lib/icons';
import { cn, formatCoursePrice } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { PublicCourseWithDetails } from '@/services/publicCourses';

interface ScheduleRowProps {
  course: PublicCourseWithDetails;
  /** The session date we're displaying this row under — used to compute week-of-N badge */
  displayDate: string;
}

const DAY_MS = 1000 * 60 * 60 * 24;

function extractTime(timeSchedule: string | null): string {
  if (!timeSchedule) return '';
  const match = timeSchedule.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : '';
}

function weekOfSeries(startDate: string | null, totalWeeks: number | null | undefined, displayDate: string): string | null {
  if (!startDate || !totalWeeks) return null;
  const start = new Date(startDate);
  const current = new Date(displayDate);
  if (isNaN(start.getTime()) || isNaN(current.getTime())) return null;
  const weeksElapsed = Math.floor((current.getTime() - start.getTime()) / (DAY_MS * 7));
  const currentWeek = Math.min(Math.max(1, weeksElapsed + 1), totalWeeks);
  return `Uke ${currentWeek} av ${totalWeeks}`;
}

function spotsLabel(spotsAvailable: number, max: number | null): string | null {
  if (max == null) return null;
  if (spotsAvailable <= 0) return 'Fullt';
  if (spotsAvailable <= 3) return `${spotsAvailable} plasser igjen`;
  return null;
}

export function ScheduleRow({ course, displayDate }: ScheduleRowProps) {
  const location = useLocation();
  const time = extractTime(course.time_schedule);
  const instructorName = course.instructors[0]?.name || course.instructor?.name || null;
  // Link target is always the owning seller's team slug, regardless of whether
  // this row is rendered on an individual studio page or an aggregated space
  // page. Every course belongs to exactly one seller; the booking flow must
  // always return to that seller's URL.
  const studioSlug = course.seller?.slug ?? '';
  const spots = spotsLabel(course.spots_available, course.max_participants);
  const isFull = spots === 'Fullt';
  const isCancelled = course.status === 'cancelled';

  const seriesBadge = course.course_type === 'course-series'
    ? weekOfSeries(course.start_date, course.total_weeks, displayDate)
    : null;

  return (
    <Link
      to={`/${studioSlug}/${course.slug}`}
      state={{ backgroundLocation: location }}
      className={cn(
        'group flex items-center gap-4 px-3 py-3 smooth-transition',
        'hover:bg-muted/50 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50',
        (isFull || isCancelled) && 'opacity-70',
      )}
      aria-label={`${course.title}${time ? `, kl. ${time}` : ''}`}
    >
      {/* Time (fixed width on sm+) */}
      <div className="w-14 shrink-0 text-sm font-medium text-foreground tabular-nums">
        {time || '—'}
      </div>

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium text-foreground truncate">
            {course.title}
          </span>
          {isCancelled && (
            <Badge variant="warning" shape="rect" size="sm">Avlyst</Badge>
          )}
          {seriesBadge && !isCancelled && (
            <Badge variant="neutral" shape="rect" size="sm">{seriesBadge}</Badge>
          )}
        </div>

        <div className="mt-0.5 flex items-center gap-x-3 gap-y-0 text-xs text-muted-foreground">
          {instructorName && (
            <span className="flex items-center gap-1 truncate">
              <User className="size-3.5 shrink-0" />
              <span className="truncate">{instructorName}</span>
            </span>
          )}
          {course.location && (
            <span className="hidden sm:flex items-center gap-1 truncate">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{course.location}</span>
            </span>
          )}
        </div>
      </div>

      {/* Right: price + spots */}
      <div className="shrink-0 flex flex-col items-end gap-0.5">
        <span className="text-sm font-medium text-foreground whitespace-nowrap tabular-nums">
          {formatCoursePrice(course.price)}
        </span>
        {spots && (
          <span className={cn(
            'text-xs font-medium tracking-wide whitespace-nowrap',
            isFull ? 'text-muted-foreground' : 'text-warning',
          )}>
            {spots}
          </span>
        )}
      </div>
    </Link>
  );
}
