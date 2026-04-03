import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, CalendarPlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type { Course } from '@/types/dashboard';

interface CoursesListProps {
  courses: Course[];
  hideHeader?: boolean;
}


/**
 * Parse a date string (ISO YYYY-MM-DD or full ISO) into local year/month/day.
 * Avoids timezone bugs from `new Date('YYYY-MM-DD')` which parses as UTC.
 */
function parseLocalDate(dateString: string): { year: number; month: number; day: number } | null {
  const parts = dateString.slice(0, 10).split('-');
  if (parts.length < 3) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}


/** Check if a date string represents today */
function isToday(dateString: string | undefined): boolean {
  if (!dateString) return false;
  const parsed = parseLocalDate(dateString);
  if (!parsed) return false;
  const now = new Date();
  return parsed.year === now.getFullYear() &&
    parsed.month === now.getMonth() + 1 &&
    parsed.day === now.getDate();
}

/** Build a sortable timestamp from date + time strings (timezone-safe) */
function getSortKey(course: Course): number {
  if (!course.date) return Infinity;
  const parsed = parseLocalDate(course.date);
  if (!parsed) return Infinity;
  const [h, m] = (course.time || '00:00').split(':').map(Number);
  return new Date(parsed.year, parsed.month - 1, parsed.day, h || 0, m || 0).getTime();
}

/** Sort courses chronologically by date + time */
function sortChronologically(courses: Course[]): Course[] {
  return [...courses].sort((a, b) => getSortKey(a) - getSortKey(b));
}


/** Shared course row used by both views */
function CourseRow({ course }: { course: Course }) {
  return (
    <Link
      to={`/teacher/courses/${course.id}`}
      className="group relative flex items-center justify-between gap-4 rounded-lg px-4 py-3 outline-none smooth-transition hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="type-label text-foreground truncate">
            {course.title}
          </span>
          {course.time && (
            <span className="type-meta text-muted-foreground">{course.time}</span>
          )}
        </div>
        <p className="type-body-sm mt-0.5 truncate text-muted-foreground">{course.subtitle}</p>
      </div>
    </Link>
  );
}

function CoursesEmptyCard({ timeFilter }: { timeFilter: 'today' | 'week' }) {
  return (
    <EmptyState
      icon={CalendarPlus}
      title={timeFilter === 'today' ? 'Ingen kurs i dag' : 'Ingen kurs denne uken'}
      description={timeFilter === 'today' ? 'Ingen kurs i dag.' : 'Ingen kurs denne uken.'}
      variant="compact"
      action={(
        <Link
          to="/teacher/courses"
          className="type-meta inline-flex items-center gap-1 text-muted-foreground smooth-transition hover:text-foreground"
        >
          Se alle kurs
          <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    />
  );
}

export const CoursesList = memo(function CoursesList({ courses, hideHeader = false }: CoursesListProps) {
  const todayCourses = useMemo(
    () => sortChronologically(courses.filter(c => isToday(c.date))),
    [courses]
  );

  return (
    <div className="flex flex-col">
      {!hideHeader && <h2 className="type-title mb-3 text-foreground">Dagens kurs</h2>}

      <Card className="overflow-hidden">
      <div className="px-3 py-3">
        {todayCourses.length === 0 ? (
          <CoursesEmptyCard timeFilter="today" />
        ) : (
          <div className="divide-y divide-border">
            {todayCourses.map((course) => (
              <CourseRow key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
      </Card>
    </div>
  );
});
