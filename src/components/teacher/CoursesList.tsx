import { useState, memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, CalendarPlus } from 'lucide-react';
import type { Course, CourseType } from '@/types/dashboard';
import { FilterTabs, FilterTab } from '@/components/ui/filter-tabs';

interface CoursesListProps {
  courses: Course[];
}

const getCourseColor = (type: CourseType): string => {
  const colors: Record<CourseType, string> = {
    private: 'bg-course-private ring-2 ring-course-private-ring',
    online: 'bg-course-online ring-2 ring-course-online-ring',
    yin: 'bg-course-yin ring-2 ring-course-yin-ring',
    meditation: 'bg-course-meditation ring-2 ring-course-meditation-ring',
    vinyasa: 'bg-course-vinyasa ring-2 ring-course-vinyasa-ring',
    'course-series': 'bg-course-series ring-2 ring-course-series-ring',
  };
  return colors[type] || 'bg-muted';
};

const getCourseTypeLabel = (type: CourseType): string => {
  const labels: Record<CourseType, string> = {
    private: 'Privat',
    online: 'Online',
    yin: 'Yin',
    meditation: 'Meditasjon',
    vinyasa: 'Vinyasa',
    'course-series': 'Kursrekke',
  };
  return labels[type] || type;
};

/**
 * Format a date to short Norwegian day name (Man, Tir, Ons, etc.)
 */
const getShortDayName = (dateString: string | undefined): string | null => {
  if (!dateString) return null;

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  const dayNames = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
  return dayNames[date.getDay()];
};

/**
 * Check if a date is today
 */
const isToday = (dateString: string | undefined): boolean => {
  if (!dateString) return false;

  const date = new Date(dateString);
  const today = new Date();

  return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
};

export const CoursesList = memo(function CoursesList({ courses }: CoursesListProps) {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week'>('today');

  // Filter courses based on toggle - "I dag" shows first 2, "Hele uken" shows all
  const filteredCourses = timeFilter === 'today' ? courses.slice(0, 2) : courses;

  // In week view, check if all courses are on the same day (then no need to show day)
  const showDayIndicator = useMemo(() => {
    if (timeFilter !== 'week') return false;
    if (filteredCourses.length <= 1) return false;

    // Check if there are courses on different days
    const uniqueDays = new Set(
      filteredCourses
        .filter(c => c.date)
        .map(c => new Date(c.date!).toDateString())
    );
    return uniqueDays.size > 1;
  }, [timeFilter, filteredCourses]);

  return (
    <div className="col-span-1 md:col-span-3 lg:col-span-4 rounded-3xl bg-white p-7 border border-gray-200 ios-ease hover:border-ring">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-geist text-sm font-medium text-text-primary">Dine kurs</h3>
        <FilterTabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as 'today' | 'week')}>
          <FilterTab value="today">I dag</FilterTab>
          <FilterTab value="week">Hele uken</FilterTab>
        </FilterTabs>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCourses.length === 0 ? (
          <div className="col-span-full rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-white border border-gray-200">
            <div className="w-10 h-10 bg-white border border-border rounded-xl flex items-center justify-center mb-3">
              <CalendarPlus className="w-4 h-4 text-text-tertiary" />
            </div>
            <h4 className="text-sm font-medium text-text-primary">Ingen planlagte kurs</h4>
            <p className="text-xs text-text-secondary mt-1 max-w-xs mx-auto">
              Publiser din første time eller workshop for å gjøre den synlig for kundene dine.
            </p>
          </div>
        ) : (
          filteredCourses.map((course) => {
            const dayName = showDayIndicator ? getShortDayName(course.date) : null;
            const isCourseToday = isToday(course.date);

            return (
              <div key={course.id} className="flex items-center group p-1 rounded-xl transition-colors">
                {course.time && (
                  <div className="w-14 flex-shrink-0 group-hover:text-text-primary transition-colors">
                    {/* Show day name in week view when courses span multiple days */}
                    {dayName && (
                      <span className={`block text-xxs font-medium uppercase tracking-wide ${isCourseToday ? 'text-status-confirmed-text' : 'text-text-tertiary'}`}>
                        {isCourseToday ? 'I dag' : dayName}
                      </span>
                    )}
                    <span className="text-sm font-normal text-text-secondary">
                      {course.time}
                    </span>
                  </div>
                )}
                <Link
                  to={`/teacher/courses/${course.id}`}
                  className="flex-1 min-w-0 rounded-xl bg-gray-50 p-3.5 transition-all hover:bg-gray-100 cursor-pointer flex justify-between items-center group/card"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`h-2 w-2 rounded-full flex-shrink-0 ${getCourseColor(course.type)}`}
                      aria-hidden="true"
                    />
                    <span className="sr-only">{getCourseTypeLabel(course.type)}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-text-primary group-hover/card:text-black">
                        {course.title}
                      </span>
                      <span className="text-xs text-text-secondary group-hover/card:text-text-primary transition-colors">{course.subtitle}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ring group-hover/card:text-text-tertiary group-hover/card:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});










