import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { extractTimeFromSchedule } from '@/utils/timeExtraction';
import type { PublicCourseWithDetails } from '@/services/publicCourses';

interface TimelineClassCardProps {
  course: PublicCourseWithDetails;
  studioSlug: string;
  isSignedUp: boolean;
}

export const TimelineClassCard = ({
  course,
  studioSlug,
  isSignedUp,
}: TimelineClassCardProps) => {
  const timeInfo = extractTimeFromSchedule(course.time_schedule);
  const isFull = course.spots_available === 0;
  const hasInstructor = course.style?.name; // Using style as proxy for instructor data

  // Availability text
  const getAvailabilityText = () => {
    if (isFull) return 'Fullt';
    if (course.spots_available <= 3) {
      return `Kun ${course.spots_available} ${course.spots_available === 1 ? 'plass' : 'plasser'}`;
    }
    return 'Ledige plasser';
  };

  // Availability color
  const getAvailabilityColor = () => {
    if (isFull) return 'text-text-tertiary';
    if (course.spots_available <= 3) return 'text-status-waitlist-text';
    return 'text-status-confirmed-text';
  };

  return (
    <Link to={`/studio/${studioSlug}/${course.id}`}>
      <div className="group bg-white border border-gray-200 rounded-2xl p-1 transition-all hover:border-gray-300 cursor-pointer">
        <div className="flex items-stretch">
          {/* Time Column */}
          <div className="w-20 bg-surface rounded-xl flex flex-col items-center justify-center shrink-0 border border-gray-100 group-hover:bg-gray-100 transition-colors">
            {timeInfo ? (
              <span className="text-base font-bold text-text-primary">
                {timeInfo.time}
              </span>
            ) : (
              <span className="text-xs text-text-tertiary">Tid kommer</span>
            )}
          </div>

          {/* Info Section */}
          <div className="p-4 grow flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Title + Meta */}
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-text-primary text-base mb-1 group-hover:text-sidebar-foreground transition-colors truncate">
                {course.title}
              </h4>
              <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap">
                {hasInstructor && (
                  <>
                    <User className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
                    <span className="truncate">{course.style?.name || 'Instruktør'}</span>
                    <span className="text-border shrink-0">•</span>
                  </>
                )}
                {course.duration && <span className="shrink-0">{course.duration} min</span>}
              </div>
            </div>

            {/* Right: Price + Availability + CTA */}
            <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto border-t md:border-t-0 border-gray-100 pt-2 md:pt-0">
              <div className="flex flex-col items-start md:items-end">
                {course.price ? (
                  <span className="font-medium text-text-primary">{course.price} kr</span>
                ) : (
                  <span className="font-medium text-status-confirmed-text">Gratis</span>
                )}
                <span className={`text-xxs font-medium ${getAvailabilityColor()}`}>
                  {getAvailabilityText()}
                </span>
              </div>

              {/* CTA Button */}
              {isSignedUp ? (
                <Button
                  variant="outline-soft"
                  size="compact"
                  disabled
                  className="border-status-confirmed-border bg-status-confirmed-bg text-status-confirmed-text shrink-0"
                  onClick={(e) => e.preventDefault()}
                >
                  Påmeldt
                </Button>
              ) : isFull ? (
                <Button
                  variant="outline-soft"
                  size="compact"
                  disabled
                  className="shrink-0"
                  onClick={(e) => e.preventDefault()}
                >
                  Fullt
                </Button>
              ) : (
                <Button size="compact" className="shrink-0">
                  Meld deg på
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
