import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { Skeleton } from '@/components/ui/skeleton';
import { DateBadge } from '@/components/ui/date-badge';
import { formatTimeRange } from '@/utils/dateFormatting';
import { formatKroner } from '@/lib/utils';
import type { SessionScheduleRow } from '@/services/courses';

/**
 * Determines if a course needs attention based on enrollment.
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

/**
 * For active course-series, calculates which week we're on.
 * Returns "Uke X/Y" or null if not applicable.
 */
function getWeekLabel(course: SessionScheduleRow): string | null {
  if (
    course.courseType !== 'course-series' ||
    course.courseStatus !== 'active' ||
    !course.totalWeeks ||
    !course.courseStartDate
  ) {
    return null;
  }

  const start = new Date(course.courseStartDate + 'T00:00:00');
  const now = new Date();
  if (now < start) return null;

  const weekNum = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  const clamped = Math.min(weekNum, course.totalWeeks);
  return `Uke ${clamped}/${course.totalWeeks}`;
}

function getEnrollmentLabel(session: SessionScheduleRow): string {
  const { signupsCount, maxParticipants } = session;
  if (!maxParticipants) return `${signupsCount} påmeldte`;
  if (signupsCount >= maxParticipants) return 'Fullt';
  return `${signupsCount}/${maxParticipants} påmeldte`;
}

const INITIAL_VISIBLE = 5;
const LOAD_MORE_INCREMENT = 5;
const SHOW_ALL_THRESHOLD = 2; // if only this many remain after expanding, just show all

interface CourseListViewProps {
  courses: SessionScheduleRow[];
  flat?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  'course-series': 'Kursrekker',
  'event': 'Arrangementer',
  'online': 'Nettkurs',
};

const TYPE_ORDER = ['course-series', 'event', 'online'];

function CourseRow({ course }: { course: SessionScheduleRow }) {
  const navigate = useNavigate();
  const urgency = getUrgencyInfo(course);
  const enrollmentLabel = getEnrollmentLabel(course);
  const weekLabel = getWeekLabel(course);

  return (
    <div
      className="group cursor-pointer rounded-lg border-b border-border px-2 outline-none smooth-transition hover:bg-surface-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 last:border-b-0"
      onClick={() => navigate(`/teacher/courses/${course.courseId}`)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/teacher/courses/${course.courseId}`); } }}
      role="button"
      tabIndex={0}
      aria-label={`Åpne kurs: ${course.courseTitle}`}
    >
      <div className="flex items-center gap-3 py-3">
        {/* Date badge */}
        <DateBadge dateStr={course.sessionDate} />

        {/* Center: title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <h3 className="type-label truncate text-foreground">
              {course.courseTitle}
            </h3>
            {course.courseStatus === 'draft' ? (
              <StatusIndicator
                variant="neutral"
                mode="badge"
                size="xs"
                label="Utkast"
                className="flex-shrink-0"
              />
            ) : course.courseStatus === 'cancelled' ? (
              <StatusIndicator
                variant="neutral"
                mode="badge"
                size="xs"
                label="Avlyst"
                className="flex-shrink-0"
              />
            ) : urgency.isUrgent && urgency.reason ? (
              <StatusIndicator
                variant="warning"
                mode="badge"
                size="xs"
                label={urgency.reason}
                className="flex-shrink-0"
              />
            ) : null}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {(course.startTime || course.endTime) && (
              <span className="type-meta text-muted-foreground">
                {(() => {
                  const d = new Date(course.sessionDate + 'T12:00:00');
                  const day = d.toLocaleDateString('nb-NO', { weekday: 'short' });
                  return `${day.charAt(0).toUpperCase()}${day.slice(1)}`;
                })()}{' '}
                {formatTimeRange(course.startTime, course.endTime)}
              </span>
            )}
            {weekLabel && (
              <span className="type-meta text-muted-foreground">
                {weekLabel}
              </span>
            )}
            <span className="type-meta inline-flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
              {enrollmentLabel}
            </span>
            {course.location && (
              <span className="type-meta inline-flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{course.location}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: price + chevron */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="type-label text-foreground">
            {formatKroner(course.price)}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-muted-foreground smooth-transition" />
        </div>
      </div>
    </div>
  );
}

function CourseGroup({ label, courses, showHeader }: { label: string; courses: SessionScheduleRow[]; showHeader: boolean }) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [courses]);

  const sorted = useMemo(
    () => [...courses].sort((a, b) => a.sessionDate.localeCompare(b.sessionDate)),
    [courses]
  );
  // If showing more would leave only a few stragglers, just show all
  const effectiveVisible = (sorted.length - visibleCount) <= SHOW_ALL_THRESHOLD ? sorted.length : visibleCount;
  const visible = sorted.slice(0, effectiveVisible);
  const remainingCount = sorted.length - effectiveVisible;

  return (
    <section>
      {showHeader && (
        <h2 className="type-title border-t border-border pb-3 pt-4 text-foreground">
          {label}
        </h2>
      )}
      {visible.map(c => <CourseRow key={c.sessionId} course={c} />)}
      {(remainingCount > 0 || visibleCount > INITIAL_VISIBLE) && (
        <div className="flex justify-center gap-3 pt-4 pb-2">
          {remainingCount > 0 && (
            <Button
              variant="outline-soft"
              size="sm"
              onClick={() => setVisibleCount(prev => prev + LOAD_MORE_INCREMENT)}
            >
              Vis {Math.min(remainingCount, LOAD_MORE_INCREMENT)} flere
            </Button>
          )}
          {visibleCount > INITIAL_VISIBLE && (
            <Button
              variant="outline-soft"
              size="sm"
              onClick={() => setVisibleCount(INITIAL_VISIBLE)}
            >
              Vis færre
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

export function CourseListView({ courses, flat = false }: CourseListViewProps) {
  const groups = useMemo(() => {
    const grouped: Record<string, SessionScheduleRow[]> = {};
    for (const course of courses) {
      const type = course.courseType || 'event';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(course);
    }
    return TYPE_ORDER
      .filter(t => grouped[t]?.length)
      .map(t => ({ label: TYPE_LABELS[t] || t, courses: grouped[t] }));
  }, [courses]);

  const showHeaders = !flat && groups.length > 1;

  return (
    <div className={showHeaders ? 'space-y-10' : undefined}>
      {groups.map(group => (
        <CourseGroup key={group.label} label={group.label} courses={group.courses} showHeader={showHeaders} />
      ))}
    </div>
  );
}

export function CourseListSkeleton() {
  return (
    <div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border px-2 py-3 last:border-b-0">
          <div className="size-11 rounded-lg border border-border shrink-0 flex flex-col items-center justify-center gap-0.5">
            <Skeleton className="h-2 w-5 rounded-sm" />
            <Skeleton className="h-3 w-4 rounded-sm" />
          </div>
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}
