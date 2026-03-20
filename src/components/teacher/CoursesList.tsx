import { useState, memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, CalendarPlus } from 'lucide-react';
import type { Course } from '@/types/dashboard';
import { FilterTabs, FilterTab } from '@/components/ui/filter-tabs';

interface CoursesListProps {
  courses: Course[];
}

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
    <Link
      to={`/teacher/courses/${course.id}`}
      className="flex items-center justify-between gap-4 p-3 rounded-lg group hover:bg-zinc-50 smooth-transition relative focus-visible:ring-2 focus-visible:ring-zinc-400/50 outline-none"
    >
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">
            {course.title}
          </span>
          {course.time && (
            <span className="text-xs text-text-secondary">{course.time}</span>
          )}
        </div>
        <p className="text-xs text-text-secondary truncate mt-0.5">{course.subtitle}</p>
      </div>
    </Link>
  );
}

function EmptyState({ timeFilter }: { timeFilter: 'today' | 'week' }) {
  return (
    <div className="p-8 flex flex-col items-center justify-center text-center">
      <div className="w-10 h-10 bg-surface-elevated rounded-xl flex items-center justify-center mb-3">
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
        className="text-xs text-text-secondary hover:text-text-primary mt-3 smooth-transition inline-flex items-center gap-1"
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
    <div className="col-span-1 md:col-span-3 lg:col-span-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-text-primary">Dine kurs</h2>
        <FilterTabs variant="pill" value={timeFilter} onValueChange={(v) => setTimeFilter(v as 'today' | 'week')}>
          <FilterTab value="today">I dag</FilterTab>
          <FilterTab value="week">Hele uken</FilterTab>
        </FilterTabs>
      </div>

      <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
      <div className="px-2 py-3">
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
            <div className="divide-y divide-zinc-100">
              {dayGroups.map((group) => (
                <div key={group.key} className="pt-3 first:pt-0">
                  <h4 className="text-xxs font-medium text-text-secondary mb-1 px-3">
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
    </div>
  );
});
