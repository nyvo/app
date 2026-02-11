import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { formatDateLong } from '@/utils/dateFormatting';
import { extractTimeFromSchedule } from '@/utils/timeExtraction';
import type { PublicCourseWithDetails } from '@/services/publicCourses';
import {
  getAvailabilityText,
  getAvailabilityVariant,
  getEventDisplayDate,
  getDateDay,
  getDateMonthShort,
  formatDuration,
  extractFullDayFromSchedule,
} from './courseCardUtils';

interface CourseSeriesCardProps {
  course: PublicCourseWithDetails;
  studioSlug: string;
  isSignedUp: boolean;
}

export const CourseSeriesCard = ({
  course,
  studioSlug,
  isSignedUp,
}: CourseSeriesCardProps) => {
  const isFull = course.spots_available === 0;
  const nextDate = getEventDisplayDate(course.next_session, course.start_date);
  const timeInfo = extractTimeFromSchedule(course.time_schedule);
  const dayName = extractFullDayFromSchedule(course.time_schedule);

  // Build secondary metadata
  const metaItems: string[] = [];
  if (dayName) {
    metaItems.push(dayName);
  }
  if (timeInfo) {
    metaItems.push(timeInfo.time);
  }
  if (course.duration) {
    metaItems.push(formatDuration(course.duration));
  }

  return (
    <Link to={`/studio/${studioSlug}/${course.id}`} className="block">
      <div className="group relative rounded-2xl bg-white border border-zinc-200 p-5 ios-ease hover:border-zinc-400 hover:bg-zinc-50/50 cursor-pointer">
        {/* Availability badge — pinned to top-right edge */}
        <div className="absolute -top-2.5 right-4">
          <StatusIndicator
            variant={getAvailabilityVariant(course.spots_available)}
            mode="badge"
            size="xs"
            label={getAvailabilityText(course.spots_available)}
          />
        </div>

        <div className="flex gap-4">
          {/* Zone 1: Date block */}
          {nextDate ? (
            <div
              className="w-14 shrink-0 self-start rounded-xl bg-surface-elevated border border-zinc-200 py-2.5 text-center"
              aria-label={formatDateLong(nextDate)}
            >
              <div className="text-lg font-medium text-text-primary leading-tight">
                {getDateDay(nextDate)}
              </div>
              <div className="text-xxs font-medium text-text-tertiary uppercase tracking-wider mt-0.5">
                {getDateMonthShort(nextDate)}
              </div>
            </div>
          ) : (
            <div className="w-14 shrink-0 self-start rounded-xl bg-surface-elevated border border-zinc-200 py-2.5 text-center">
              <div className="text-xs text-text-tertiary">Dato kommer</div>
            </div>
          )}

          {/* Zone 2: Course details */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-text-primary transition-colors truncate">
              {course.title}
            </h3>
            {metaItems.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-text-tertiary mt-1 flex-wrap">
                {metaItems.map((item, i) => (
                  <span key={i} className="flex items-center gap-2 shrink-0">
                    {i > 0 && <span className="text-text-tertiary" aria-hidden="true">&middot;</span>}
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Zone 3: Booking/Status — right-aligned */}
          <div className="shrink-0 flex flex-col items-end justify-center gap-1 min-w-[100px]">
            <span className="text-lg font-medium text-text-primary">
              {course.price ? `${course.price} kr` : 'Gratis'}
            </span>
            {isSignedUp ? (
              <Button
                variant="outline-soft"
                size="compact"
                disabled
                className="w-full border-status-confirmed-border bg-status-confirmed-bg text-status-confirmed-text mt-1"
                onClick={(e) => e.preventDefault()}
              >
                Påmeldt
              </Button>
            ) : !isFull && (
              <Button size="compact" className="w-full mt-1">
                Meld deg på
              </Button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};
