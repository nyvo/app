import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { formatCourseStartTime } from '@/utils/dateFormatting';
import type { DetailedCourse } from '@/types/dashboard';

interface CoursePreviewCardProps {
  course: DetailedCourse;
  showUrgency?: boolean;
}

/**
 * Determines if a course needs attention based on enrollment.
 *
 * Shows "Lav påmelding" only when a course is starting soon with low enrollment.
 * This ensures the warning is actionable and meaningful.
 *
 * Trigger: Course starting within 7 days with less than 40% enrollment
 */
function getUrgencyInfo(course: DetailedCourse): { isUrgent: boolean; reason?: string } {
  const now = new Date();

  // Only check upcoming courses - active/completed don't need urgency
  if (course.status !== 'upcoming' || !course.startDate) {
    return { isUrgent: false };
  }

  const startDate = new Date(course.startDate);
  const daysUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  // Course already started or in the past
  if (daysUntilStart < 0) {
    return { isUrgent: false };
  }

  const enrollmentRate = course.maxParticipants > 0
    ? course.participants / course.maxParticipants
    : 1;

  // Single, clear trigger: Starting within 7 days with low enrollment (<40%)
  if (daysUntilStart <= 7 && enrollmentRate < 0.4) {
    return { isUrgent: true, reason: 'Lav påmelding' };
  }

  return { isUrgent: false };
}

/**
 * Formats the time signal for display using centralized utility
 */
function getTimeSignal(course: DetailedCourse): string {
  return formatCourseStartTime(
    course.startDate,
    course.status,
    course.courseType,
    course.currentWeek,
    course.totalWeeks
  );
}

/**
 * Gets the enrollment status display.
 * Full courses show a green badge; others show consistent "X/Y" text.
 */
function getEnrollmentStatus(course: DetailedCourse): {
  text: string;
  isFull: boolean;
  textClass: string;
} {
  const isFull = course.participants >= course.maxParticipants;

  // Always show enrollment numbers, "Fullt" badge will indicate if full
  const textClass = 'text-xs font-medium text-text-secondary';

  return {
    text: `${course.participants}/${course.maxParticipants}`,
    isFull: isFull,
    textClass
  };
}

export function CoursePreviewCard({ course, showUrgency = true }: CoursePreviewCardProps) {
  const navigate = useNavigate();
  const urgency = showUrgency ? getUrgencyInfo(course) : { isUrgent: false };
  const timeSignal = getTimeSignal(course);
  const enrollment = getEnrollmentStatus(course);

  return (
    <div
      className={cn(
        "group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 cursor-pointer bg-white hover:bg-zinc-50/50",
        urgency.isUrgent
          ? "border-amber-200 hover:border-amber-300"
          : "border-zinc-200 hover:border-zinc-400"
      )}
      onClick={() => navigate(`/teacher/courses/${course.id}`)}
      role="article"
      aria-label={`${course.title}, ${timeSignal}, ${enrollment.text} påmeldt`}
    >
      {/* Course info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          {urgency.isUrgent && urgency.reason && (
            <StatusIndicator
              variant="warning"
              mode="badge"
              size="xs"
              label={urgency.reason}
              className="shrink-0"
            />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          {course.timeSchedule && (
            <span className="truncate">
              {course.timeSchedule}
            </span>
          )}
          {course.timeSchedule && course.location && (
            <span>·</span>
          )}
          <span className="truncate">
            {course.location}
          </span>
        </div>
      </div>

      {/* Attendance + Week (horizontal, attendance stronger) */}
      <div className="shrink-0 hidden sm:flex items-center gap-1.5">
        {enrollment.isFull ? (
          <>
            <StatusIndicator
              variant="success"
              mode="badge"
              size="xs"
              label="Fullt"
            />
            {timeSignal && (
              <>
                <span className="text-xs text-text-tertiary">·</span>
                <span className="text-xs font-normal text-text-tertiary">
                  {timeSignal}
                </span>
              </>
            )}
          </>
        ) : (
          <>
            <span className="text-xs font-medium text-text-primary">
              {enrollment.text}
            </span>
            {timeSignal && (
              <>
                <span className="text-xs text-text-tertiary">·</span>
                <span className="text-xs font-normal text-text-tertiary">
                  {timeSignal}
                </span>
              </>
            )}
          </>
        )}
      </div>

      {/* Chevron - navigation affordance */}
      <div className="shrink-0 flex items-center ml-2">
        <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
}

/**
 * Skeleton for horizontal course preview card
 */
export function CoursePreviewCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-zinc-200 animate-pulse">
      {/* Course info skeleton */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="h-4 w-48 bg-surface-elevated rounded" />
        <div className="h-3 w-32 bg-surface-elevated rounded" />
      </div>

      {/* Time signal skeleton */}
      <div className="shrink-0 hidden sm:block">
        <div className="h-4 w-16 bg-surface-elevated rounded" />
      </div>

      {/* Enrollment skeleton */}
      <div className="shrink-0">
        <div className="h-4 w-12 bg-surface-elevated rounded" />
      </div>

      {/* Status skeleton */}
      <div className="shrink-0">
        <div className="h-6 w-16 bg-surface-elevated rounded-full" />
      </div>

      {/* Actions skeleton */}
      <div className="shrink-0 flex items-center gap-1">
        <div className="h-8 w-8 bg-surface-elevated rounded-full" />
        <div className="h-4 w-4 bg-surface-elevated rounded" />
      </div>
    </div>
  );
}
