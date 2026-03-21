import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Users, MapPin } from 'lucide-react';
import { StatusIndicator } from '@/components/ui/status-indicator';
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

interface CourseListViewProps {
  courses: SessionScheduleRow[];
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktive',
  upcoming: 'Kommende',
  draft: 'Utkast',
};

const STATUS_ORDER = ['active', 'upcoming', 'draft'];

function CourseRow({ course }: { course: SessionScheduleRow }) {
  const navigate = useNavigate();
  const urgency = getUrgencyInfo(course);
  const enrollmentLabel = getEnrollmentLabel(course);
  const weekLabel = getWeekLabel(course);

  return (
    <div
      className="group px-2 rounded-lg smooth-transition hover:bg-zinc-50/50 border-b border-zinc-100 last:border-b-0 cursor-pointer"
      onClick={() => navigate(`/teacher/courses/${course.courseId}`)}
      role="link"
      aria-label={course.courseTitle}
    >
      <div className="py-3 flex items-center gap-3">
        {/* Date badge */}
        <DateBadge dateStr={course.sessionDate} />

        {/* Center: title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <h3 className="text-sm font-medium text-text-primary truncate">
              {course.courseTitle}
            </h3>
            {urgency.isUrgent && urgency.reason && (
              <StatusIndicator
                variant="warning"
                mode="badge"
                size="xs"
                label={urgency.reason}
                className="flex-shrink-0"
              />
            )}
          </div>

          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {(course.startTime || course.endTime) && (
              <span className="text-xs text-text-secondary">
                {formatTimeRange(course.startTime, course.endTime)}
              </span>
            )}
            {weekLabel && (
              <span className="text-xs text-text-tertiary">
                {weekLabel}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
              <Users className="h-3 w-3" />
              {enrollmentLabel}
            </span>
            {course.location && (
              <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                <MapPin className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{course.location}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: price + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-text-primary">
            {formatKroner(course.price)}
          </span>
          <ChevronRight className="h-4 w-4 text-text-tertiary group-hover:text-text-secondary smooth-transition" />
        </div>
      </div>
    </div>
  );
}

export function CourseListView({ courses }: CourseListViewProps) {
  const groups = useMemo(() => {
    const grouped: Record<string, SessionScheduleRow[]> = {};
    for (const course of courses) {
      const status = course.courseStatus || 'draft';
      if (!grouped[status]) grouped[status] = [];
      grouped[status].push(course);
    }
    return STATUS_ORDER
      .filter(s => grouped[s]?.length)
      .map(s => ({ label: STATUS_LABELS[s] || s, courses: grouped[s] }));
  }, [courses]);

  // If all courses share the same status, skip the section header
  if (groups.length <= 1) {
    return (
      <div>
        {courses.map(c => <CourseRow key={c.sessionId} course={c} />)}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {groups.map(group => (
        <section key={group.label}>
          <h2 className="text-sm font-medium text-text-primary pb-3 border-t border-zinc-200 pt-4">
            {group.label}
          </h2>
          {group.courses.map(c => <CourseRow key={c.sessionId} course={c} />)}
        </section>
      ))}
    </div>
  );
}

export function CourseListSkeleton() {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="px-2 py-3 flex items-center gap-3 border-b border-zinc-100 last:border-b-0">
          <div className="w-11 h-11 rounded-lg bg-surface-elevated shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-40 bg-surface-elevated rounded" />
            <div className="h-3 w-52 bg-surface-elevated rounded" />
          </div>
          <div className="h-4 w-16 bg-surface-elevated rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}
