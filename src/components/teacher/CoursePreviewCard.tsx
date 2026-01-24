import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Users,
  Calendar,
  AlertCircle,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import type { CourseStatus } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import type { DetailedCourse } from '@/data/mockData';

interface CoursePreviewCardProps {
  course: DetailedCourse;
  showUrgency?: boolean;
}

/**
 * Determines if a course needs attention based on various factors.
 *
 * Urgency is contextual - a new course with 0 signups is normal,
 * but a course starting in 3 days with low enrollment needs attention.
 *
 * Triggers:
 * - Course starting soon AND low enrollment (time pressure + problem)
 * - Course has been open for a while but enrollment is stagnant
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

  // Urgency requires BOTH time pressure AND an enrollment issue
  // This avoids flagging new courses that just haven't had time to fill

  // Critical: Starting very soon (≤3 days) and not full
  if (daysUntilStart <= 3 && enrollmentRate < 1) {
    if (enrollmentRate < 0.3) {
      return { isUrgent: true, reason: 'Få påmeldte' };
    }
    // Only flag if significantly under capacity when very close
    if (enrollmentRate < 0.7) {
      return { isUrgent: true, reason: 'Ikke fullt' };
    }
  }

  // Warning: Starting soon (≤7 days) with low enrollment (<30%)
  if (daysUntilStart <= 7 && enrollmentRate < 0.3) {
    return { isUrgent: true, reason: 'Lav påmelding' };
  }

  // For events: starting within 2 weeks with very low enrollment (<20%)
  if (course.courseType === 'enkeltkurs' && daysUntilStart <= 14 && enrollmentRate < 0.2) {
    return { isUrgent: true, reason: 'Trenger oppmerksomhet' };
  }

  return { isUrgent: false };
}

/**
 * Formats the time signal for display
 * - Series: "Uke 4/8" or relative time
 * - Events: "Om 3 dager", "I morgen", etc.
 */
function getTimeSignal(course: DetailedCourse): string {
  // For active series, show week progress
  if (course.courseType === 'kursrekke' && course.currentWeek && course.totalWeeks) {
    return `Uke ${course.currentWeek}/${course.totalWeeks}`;
  }

  // For upcoming courses, show relative time
  if (course.startDate) {
    const now = new Date();
    const startDate = new Date(course.startDate);
    const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      // Already started - show progress or status
      if (course.status === 'active') {
        return 'Pågår';
      }
      return 'Startet';
    }
    if (daysUntil === 0) return 'I dag';
    if (daysUntil === 1) return 'I morgen';
    if (daysUntil <= 7) return `Om ${daysUntil} dager`;
    if (daysUntil <= 14) return 'Om 1 uke';
    if (daysUntil <= 30) return `Om ${Math.ceil(daysUntil / 7)} uker`;
    return formatDateShort(course.startDate);
  }

  // Fallback
  if (course.status === 'completed') return 'Fullført';
  if (course.status === 'active') return 'Pågår';
  return '';
}

function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}

/**
 * Gets the enrollment status display with visual hierarchy.
 *
 * Enrollment rate determines text styling:
 * - Full (100%): Green badge with checkmark
 * - Healthy (≥50%): Muted, blends into background
 * - Moderate (30-50%): Default weight, visible
 * - Low (<30%): Primary weight, draws attention
 */
function getEnrollmentStatus(course: DetailedCourse): {
  text: string;
  isFull: boolean;
  hasWaitlist: boolean;
  textClass: string;
} {
  const isFull = course.participants >= course.maxParticipants;
  const hasWaitlist = false; // Placeholder - would come from actual data
  const enrollmentRate = course.maxParticipants > 0
    ? course.participants / course.maxParticipants
    : 1;

  if (isFull) {
    return {
      text: 'Fullt',
      isFull: true,
      hasWaitlist,
      textClass: ''
    };
  }

  // Determine text styling based on enrollment health
  let textClass: string;
  if (enrollmentRate >= 0.5) {
    // Healthy - muted, fades into background
    textClass = 'text-sm font-normal text-muted-foreground';
  } else if (enrollmentRate >= 0.3) {
    // Moderate - visible but not alarming
    textClass = 'text-sm font-medium text-text-secondary';
  } else {
    // Low - draws attention
    textClass = 'text-sm font-medium text-text-primary';
  }

  return {
    text: `${course.participants}/${course.maxParticipants}`,
    isFull: false,
    hasWaitlist,
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
        "group flex items-center gap-4 p-4 bg-white rounded-2xl border transition-all duration-200 cursor-pointer",
        urgency.isUrgent
          ? "border-amber-200 hover:border-amber-300"
          : "border-gray-200 hover:border-ring"
      )}
      onClick={() => navigate(`/teacher/courses/${course.id}`)}
      role="article"
      aria-label={`${course.title}, ${timeSignal}, ${enrollment.text} påmeldt`}
    >
      {/* Urgency indicator */}
      {urgency.isUrgent && (
        <div className="shrink-0 w-1 h-8 rounded-full bg-amber-400" aria-hidden="true" />
      )}

      {/* Course info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          {urgency.isUrgent && urgency.reason && (
            <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xxs font-medium">
              <AlertCircle className="h-2.5 w-2.5" />
              {urgency.reason}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {course.location}
          </span>
          {course.timeSchedule && (
            <span className="hidden sm:flex items-center gap-1 truncate">
              <Calendar className="h-3 w-3 shrink-0" />
              {course.timeSchedule}
            </span>
          )}
        </div>
      </div>

      {/* Time signal */}
      <div className="shrink-0 hidden sm:flex items-center">
        <span className={cn(
          "text-xs font-medium",
          course.status === 'active' ? "text-status-confirmed-text" : "text-text-secondary"
        )}>
          {timeSignal}
        </span>
      </div>

      {/* Enrollment status */}
      <div className="shrink-0 min-w-[80px] flex items-center justify-end">
        {enrollment.isFull ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-status-confirmed-bg text-status-confirmed-text text-xs font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Fullt
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={enrollment.textClass}>
              {enrollment.text}
            </span>
          </div>
        )}
      </div>

      {/* Status badge - only show for non-obvious states */}
      {/* Upcoming courses don't need badge - time signal already conveys this */}
      {(course.status === 'active' || course.status === 'completed' || course.status === 'draft') && (
        <div className="shrink-0 flex items-center">
          <StatusBadge
            status={course.status as CourseStatus}
            size="sm"
          />
        </div>
      )}

      {/* Chevron */}
      <div className="shrink-0 flex items-center">
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
    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 animate-pulse">
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
