import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { Skeleton } from '@/components/ui/skeleton';
import type { SessionScheduleRow } from '@/services/courses';

/**
 * Shows "Lav påmelding" when starting within 7 days with < 40% enrollment.
 */
function getUrgencyInfo(session: SessionScheduleRow): { isUrgent: boolean; reason?: string } {
  if (session.courseStatus !== 'upcoming' || !session.courseStartDate) {
    return { isUrgent: false };
  }

  const now = new Date();
  const startDate = new Date(session.courseStartDate);
  const daysUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysUntilStart < 0) return { isUrgent: false };

  const enrollmentRate = session.maxParticipants && session.maxParticipants > 0
    ? session.signupsCount / session.maxParticipants
    : 1;

  if (daysUntilStart <= 7 && enrollmentRate < 0.4) {
    return { isUrgent: true, reason: 'Lav påmelding' };
  }

  return { isUrgent: false };
}

function getEnrollmentLabel(session: SessionScheduleRow): string {
  const { signupsCount, maxParticipants } = session;
  if (!maxParticipants) return `${signupsCount} påmeldte`;
  if (signupsCount >= maxParticipants) return 'Fullt';
  return `${signupsCount}/${maxParticipants} påmeldte`;
}

/**
 * Extracts a clean schedule label from time_schedule.
 * Series: "Mandager, 18:00" → "Mandager · 18:00"
 * Event:  "Mandag, 18:00"   → "Mandag · 18:00"
 */
function formatScheduleLabel(timeSchedule: string | null | undefined, startTime: string): string {
  if (!timeSchedule) return startTime || '';

  const match = timeSchedule.match(/^([A-Za-zÆØÅæøå]+)[,\s]+(\d{1,2}:\d{2})/);
  if (match) {
    return `${match[1]} · ${match[2]}`;
  }

  const dayMatch = timeSchedule.match(/^([A-Za-zÆØÅæøå]+)/);
  if (dayMatch && startTime) return `${dayMatch[1]} · ${startTime}`;

  return startTime || timeSchedule;
}

function CourseImage({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  const handleError = useCallback(() => setFailed(true), []);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        onError={handleError}
        className="size-14 rounded-lg object-cover shrink-0 bg-surface-muted"
      />
    );
  }

  return (
    <div className="size-14 rounded-lg bg-surface-muted flex items-center justify-center shrink-0">
      <ImageIcon className="size-5 text-muted-foreground/40" />
    </div>
  );
}

export function CourseCard({ course }: { course: SessionScheduleRow }) {
  const urgency = getUrgencyInfo(course);
  const enrollmentLabel = getEnrollmentLabel(course);
  const scheduleLabel = formatScheduleLabel(course.timeSchedule, course.startTime);

  const showStatusBadge = course.courseStatus === 'draft' || course.courseStatus === 'cancelled' || course.courseStatus === 'completed';

  return (
    <Link
      to={`/teacher/courses/${course.courseId}`}
      className="flex items-center gap-3 rounded-lg border border-border p-3 smooth-transition hover:bg-surface-muted/40 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <CourseImage src={course.imageUrl} alt={course.courseTitle} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="type-title truncate text-foreground">
            {course.courseTitle}
          </h3>
          {showStatusBadge && (
            <StatusIndicator
              variant="neutral"
              mode="badge"
              size="sm"
              label={course.courseStatus === 'draft' ? 'Utkast' : course.courseStatus === 'cancelled' ? 'Avlyst' : 'Avsluttet'}
              className="flex-shrink-0"
            />
          )}
          {!showStatusBadge && urgency.isUrgent && urgency.reason && (
            <StatusIndicator
              variant="warning"
              mode="badge"
              size="sm"
              label={urgency.reason}
              className="flex-shrink-0"
            />
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1 type-meta text-muted-foreground">
          {scheduleLabel && (
            <span className="truncate">{scheduleLabel}</span>
          )}
        </div>
      </div>
      <span className="type-label whitespace-nowrap flex-shrink-0 text-foreground">
        {enrollmentLabel}
      </span>
    </Link>
  );
}

const ITEMS_PER_PAGE = 6;

interface CourseListViewProps {
  courses: SessionScheduleRow[];
}

export function CourseListView({ courses }: CourseListViewProps) {
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    setCurrentPage(0);
  }, [courses]);

  const totalPages = Math.ceil(courses.length / ITEMS_PER_PAGE);
  const pageStart = currentPage * ITEMS_PER_PAGE;
  const visible = courses.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  return (
    <div>
      <div className="flex flex-col gap-2">
        {visible.map(c => <CourseCard key={c.sessionId} course={c} />)}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6 pb-2">
          <Button
            variant="outline-soft"
            size="sm"
            onClick={() => setCurrentPage(p => p - 1)}
            disabled={currentPage === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Forrige
          </Button>
          <span className="type-meta text-muted-foreground">
            Side {currentPage + 1} av {totalPages}
          </span>
          <Button
            variant="outline-soft"
            size="sm"
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={currentPage >= totalPages - 1}
            className="gap-1"
          >
            Neste
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function CourseListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
          <Skeleton className="size-14 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-4 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}
