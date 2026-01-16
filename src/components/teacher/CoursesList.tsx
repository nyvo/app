import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, CalendarPlus } from 'lucide-react';
import type { Course, CourseType } from '@/types/dashboard';

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

export const CoursesList = ({ courses }: CoursesListProps) => {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week'>('today');

  // Filter courses based on toggle - "I dag" shows first 2, "Hele uken" shows all
  const filteredCourses = timeFilter === 'today' ? courses.slice(0, 2) : courses;

  return (
    <div className="col-span-1 md:col-span-3 lg:col-span-4 rounded-3xl bg-white p-7 shadow-sm ios-ease hover:shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-geist text-sm font-semibold text-text-primary">Dine kurs</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimeFilter('today')}
            className={`h-10 px-3 py-2 text-xs font-medium rounded-lg ios-ease ${
              timeFilter === 'today'
                ? 'border border-border bg-white text-text-primary shadow-sm'
                : 'border border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
            }`}
          >
            I dag
          </button>
          <button
            onClick={() => setTimeFilter('week')}
            className={`h-10 px-3 py-2 text-xs font-medium rounded-lg ios-ease ${
              timeFilter === 'week'
                ? 'border border-border bg-white text-text-primary shadow-sm'
                : 'border border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
            }`}
          >
            Hele uken
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCourses.length === 0 ? (
          <div className="col-span-full rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-gray-50/50">
            <div className="w-12 h-12 bg-white border border-border rounded-xl flex items-center justify-center mb-4 shadow-sm">
              <CalendarPlus className="w-5 h-5 text-text-tertiary" />
            </div>
            <h4 className="text-base font-medium text-text-primary">Ingen planlagte kurs</h4>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
              Publiser din første time eller workshop for å gjøre den synlig for kundene dine.
            </p>
          </div>
        ) : (
          filteredCourses.map((course) => (
          <div key={course.id} className="flex items-center group p-1 rounded-xl transition-colors">
            {course.time && (
              <div className="w-14 text-sm font-medium text-text-tertiary flex-shrink-0 group-hover:text-muted-foreground transition-colors">
                {course.time}
              </div>
            )}
            <Link
              to={`/teacher/courses/${course.id}`}
              className="flex-1 min-w-0 rounded-xl bg-gray-50 p-3.5 transition-all hover:bg-white hover:shadow-sm cursor-pointer flex justify-between items-center group/card"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${getCourseColor(course.type)}`}></div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-text-primary group-hover/card:text-black">
                    {course.title}
                  </span>
                  <span className="text-xs text-muted-foreground group-hover/card:text-text-secondary">{course.subtitle}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-ring group-hover/card:text-text-tertiary group-hover/card:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
            </Link>
          </div>
        ))
        )}
      </div>
    </div>
  );
};














