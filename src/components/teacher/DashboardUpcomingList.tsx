import { Link } from 'react-router-dom';
import { DateBadge } from '@/components/ui/date-badge';
import { Card } from '@/components/ui/card';
import type { Course } from '@/types/dashboard';

interface DashboardUpcomingListProps {
  courses: Course[];
}

function parseLocalDate(dateString: string): { year: number; month: number; day: number } | null {
  const parts = dateString.slice(0, 10).split('-');
  if (parts.length < 3) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;
  return { year, month, day };
}

function getSortKey(course: Course): number {
  if (!course.date) return Infinity;
  const parsed = parseLocalDate(course.date);
  if (!parsed) return Infinity;
  const [h, m] = (course.time || '00:00').split(':').map(Number);
  return new Date(parsed.year, parsed.month - 1, parsed.day, h || 0, m || 0).getTime();
}

function formatFullDay(dateStr?: string): string {
  if (!dateStr) return '';
  const parsed = parseLocalDate(dateStr);
  if (!parsed) return '';
  const date = new Date(parsed.year, parsed.month - 1, parsed.day);
  const day = date.toLocaleDateString('nb-NO', { weekday: 'long' });
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function CourseRow({
  id,
  title,
  dateStr,
  timeText,
}: {
  id: string;
  title: string;
  dateStr?: string;
  timeText?: string;
}) {
  const dayName = formatFullDay(dateStr);

  return (
    <Link
      to={`/teacher/courses/${id}`}
      className="group flex items-center gap-2 sm:gap-3 rounded-lg px-2 py-3 outline-none smooth-transition hover:bg-surface-muted/50 focus-visible:bg-surface-muted/50"
    >
      <DateBadge dateStr={dateStr} />
      <div className="min-w-0 flex-1">
        <h3 className="type-label truncate text-foreground">{title}</h3>
        <p className="type-body-sm mt-0.5 truncate text-muted-foreground">
          {dayName}{timeText ? ` · ${timeText}` : ''}
        </p>
      </div>
    </Link>
  );
}

export function DashboardUpcomingList({ courses }: DashboardUpcomingListProps) {
  const sorted = [...courses]
    .filter((course) => course.date)
    .sort((a, b) => getSortKey(a) - getSortKey(b));

  return (
    <section>
      <h2 className="type-title mb-3 text-foreground">Neste aktiviteter</h2>
      <Card className="p-3 sm:p-4">
        {sorted.length === 0 ? (
        <div className="py-3">
          <p className="type-label text-foreground">Ingen kommende kurs</p>
          <p className="type-body-sm mt-1 text-muted-foreground">Opprett kurs for å fylle timeplanen.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {sorted.map((course) => (
            <CourseRow
              key={`${course.id}-${course.date}-${course.time}`}
              id={course.id}
              title={course.title}
              dateStr={course.date}
              timeText={course.time}
            />
          ))}
        </div>
        )}
      </Card>
    </section>
  );
}
