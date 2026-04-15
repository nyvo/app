import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
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
        className="size-14 rounded-lg object-cover shrink-0 bg-muted"
      />
    );
  }

  return (
    <div className="size-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
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
      className="flex items-center gap-3 rounded-lg border border-border p-3 smooth-transition hover:bg-muted/40 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <CourseImage src={course.imageUrl} alt={course.courseTitle} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
          <h3 className="text-base font-medium truncate text-foreground">
            {course.courseTitle}
          </h3>
          {showStatusBadge && (
            <StatusIndicator
              variant="neutral"
              mode="badge"
              size="sm"
              label={course.courseStatus === 'draft' ? 'Utkast' : course.courseStatus === 'cancelled' ? 'Avlyst' : 'Fullført'}
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
        <div className="mt-0.5 flex items-center gap-1 text-xs font-medium tracking-wide text-muted-foreground">
          {scheduleLabel && (
            <span className="truncate">{scheduleLabel}</span>
          )}
        </div>
      </div>
      <span className="text-sm font-medium whitespace-nowrap flex-shrink-0 text-foreground text-right">
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
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const prevCoursesRef = useRef(courses);

  // Reset visible count when course list changes (filter/search)
  useEffect(() => {
    if (prevCoursesRef.current !== courses) {
      setVisibleCount(ITEMS_PER_PAGE);
      prevCoursesRef.current = courses;
    }
  }, [courses]);

  const visible = courses.slice(0, visibleCount);
  const hasMore = visibleCount < courses.length;

  return (
    <div>
      <div className="flex flex-col gap-2">
        {visible.map(c => (
          <motion.div
            key={c.sessionId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            <CourseCard course={c} />
          </motion.div>
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center pt-6 pb-2">
          <Button
            variant="outline-soft"
            size="sm"
            onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
          >
            Vis flere
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
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-5 w-44 max-w-full" />
            <Skeleton className="h-3 w-32 max-w-full" />
          </div>
          <Skeleton className="h-4 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}
