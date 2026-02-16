import { useState, memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, CalendarPlus } from 'lucide-react';
import type { Course, CourseStyleType } from '@/types/dashboard';
import { FilterTabs, FilterTab } from '@/components/ui/filter-tabs';

interface CoursesListProps {
  courses: Course[];
}

const getCourseColor = (type: CourseStyleType): string => {
  const colors: Record<CourseStyleType, string> = {
    'course-series': 'bg-course-series ring-2 ring-course-series-ring',
    'event': 'bg-muted ring-2 ring-border',
  };
  return colors[type] || 'bg-muted';
};

const getCourseStyleTypeLabel = (type: CourseStyleType): string => {
  const labels: Record<CourseStyleType, string> = {
    'course-series': 'Kursrekke',
    'event': 'Arrangement',
  };
  return labels[type] || type;
};

const FULL_DAY_NAMES = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const SHORT_MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

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

/** Build a Date object in local timezone from a date string */
function toLocalDate(dateString: string): Date | null {
  const parsed = parseLocalDate(dateString);
  if (!parsed) return null;
  return new Date(parsed.year, parsed.month - 1, parsed.day);
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

interface DayGroup {
  key: string;       // YYYY-MM-DD
  sortValue: number; // timestamp for ordering
  label: string;     // "I dag" or "Mandag 17. feb"
  courses: Course[];
}

/** Group courses by calendar date, sorted chronologically */
function groupByDay(courses: Course[]): DayGroup[] {
  const sorted = sortChronologically(courses);
  const groups = new Map<string, DayGroup>();

  for (const course of sorted) {
    if (!course.date) continue;
    const key = course.date.slice(0, 10); // YYYY-MM-DD
    if (groups.has(key)) {
      groups.get(key)!.courses.push(course);
      continue;
    }

    const localDate = toLocalDate(course.date);
    if (!localDate) continue;

    const dayName = FULL_DAY_NAMES[localDate.getDay()];
    const dayNum = localDate.getDate();
    const monthName = SHORT_MONTH_NAMES[localDate.getMonth()];
    const label = isToday(course.date)
      ? 'I dag'
      : `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayNum}. ${monthName}`;

    groups.set(key, {
      key,
      sortValue: localDate.getTime(),
      label,
      courses: [course],
    });
  }

  // Explicit sort by date (don't rely on Map insertion order)
  return Array.from(groups.values()).sort((a, b) => a.sortValue - b.sortValue);
}

/** Shared course row used by both views */
function CourseRow({ course }: { course: Course }) {
  return (
    <div className="flex items-center group p-1 rounded-xl transition-colors">
      {course.time && (
        <div className="w-14 flex-shrink-0 group-hover:text-text-primary transition-colors">
          <span className="text-sm font-normal text-text-secondary">
            {course.time}
          </span>
        </div>
      )}
      <Link
        to={`/teacher/courses/${course.id}`}
        className="flex-1 min-w-0 rounded-2xl bg-zinc-50 border border-zinc-200 p-3.5 smooth-transition hover:bg-zinc-50/50 cursor-pointer flex justify-between items-center group/card focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white outline-none"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`h-2 w-2 rounded-full flex-shrink-0 ${getCourseColor(course.type)}`}
            aria-hidden="true"
          />
          <span className="sr-only">{getCourseStyleTypeLabel(course.type)}</span>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-text-primary group-hover/card:text-text-primary">
              {course.title}
            </span>
            <span className="text-xs text-text-secondary group-hover/card:text-text-primary transition-colors">{course.subtitle}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-ring group-hover/card:text-text-tertiary group-hover/card:translate-x-0.5 smooth-transition flex-shrink-0 ml-2" />
      </Link>
    </div>
  );
}

function EmptyState({ timeFilter }: { timeFilter: 'today' | 'week' }) {
  return (
    <div className="rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-surface/30 border border-zinc-200">
      <div className="w-10 h-10 bg-white border border-zinc-200 rounded-xl flex items-center justify-center mb-3">
        <CalendarPlus className="w-4 h-4 text-text-tertiary" />
      </div>
      <p className="text-sm font-medium text-text-primary">
        {timeFilter === 'today' ? 'Ingen kurs i dag' : 'Ingen kurs denne uken'}
      </p>
      <p className="text-xs text-text-secondary mt-1 max-w-xs mx-auto">
        {timeFilter === 'today'
          ? 'Du har ingen kurs planlagt for i dag.'
          : 'Du har ingen kurs planlagt denne uken.'}
      </p>
      <Link
        to="/teacher/courses"
        className="text-xs text-text-tertiary hover:text-text-secondary mt-3 smooth-transition inline-flex items-center gap-1"
      >
        Se alle kurs
        <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

export const CoursesList = memo(function CoursesList({ courses }: CoursesListProps) {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week'>('today');

  // Today: filter + sort chronologically
  const todayCourses = useMemo(
    () => sortChronologically(courses.filter(c => isToday(c.date))),
    [courses]
  );

  // Week: group by day, sorted
  const dayGroups = useMemo(() => groupByDay(courses), [courses]);

  return (
    <div className="col-span-1 md:col-span-3 lg:col-span-4 rounded-2xl bg-white border border-zinc-200 overflow-hidden">
      <div className="flex items-center justify-between p-5 sm:p-6 pb-3">
        <h3 className="font-geist text-sm font-medium text-text-primary">Dine kurs</h3>
        <FilterTabs variant="pill" value={timeFilter} onValueChange={(v) => setTimeFilter(v as 'today' | 'week')}>
          <FilterTab value="today">I dag</FilterTab>
          <FilterTab value="week">Hele uken</FilterTab>
        </FilterTabs>
      </div>

      <div className="px-4 sm:px-5 pb-4 sm:pb-5">
        {/* ── Today view: single-column chronological list ── */}
        {timeFilter === 'today' && (
          todayCourses.length === 0 ? (
            <EmptyState timeFilter="today" />
          ) : (
            <div className="space-y-1">
              {todayCourses.map((course) => (
                <CourseRow key={course.id} course={course} />
              ))}
            </div>
          )
        )}

        {/* ── Week view: single-column day-grouped list ── */}
        {timeFilter === 'week' && (
          dayGroups.length === 0 ? (
            <EmptyState timeFilter="week" />
          ) : (
            <div className="space-y-5">
              {dayGroups.map((group) => (
                <div key={group.key}>
                  <h4 className="text-xs font-medium text-text-secondary mb-2 px-1">
                    {group.label}
                  </h4>
                  <div className="space-y-1">
                    {group.courses.map((course) => (
                      <CourseRow key={course.id} course={course} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
});
