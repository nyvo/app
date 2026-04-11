import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { Course } from '@/types/dashboard';

interface DashboardTodayPanelProps {
  courses: Course[];
}

export function DashboardTodayPanel({ courses }: DashboardTodayPanelProps) {
  return (
    <section>
      <h2 className="type-title mb-3 text-foreground">I dag</h2>
      <Card className="p-3 sm:p-4">
        {courses.length === 0 ? (
        <div className="flex items-center gap-2 sm:gap-3 py-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
          </div>
          <p className="type-label text-foreground">Ingen kurs i dag</p>
        </div>
      ) : (
        <div className="space-y-1">
          {courses.map((course) => (
            <Link
              key={`${course.id}-${course.date}-${course.time}`}
              to={`/teacher/courses/${course.id}`}
              className="group flex items-center justify-between gap-3 sm:gap-4 rounded-lg px-2 py-3 outline-none smooth-transition hover:bg-surface-muted/50 focus-visible:bg-surface-muted/50"
            >
              <div className="min-w-0">
                <p className="type-label truncate text-foreground">{course.title}</p>
                <p className="type-body-sm mt-1 truncate text-muted-foreground">{course.subtitle}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground smooth-transition group-hover:text-foreground" />
            </Link>
          ))}
        </div>
        )}
      </Card>
    </section>
  );
}
