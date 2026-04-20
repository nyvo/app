import { useMemo } from 'react';
import { ScheduleRow } from './ScheduleRow';
import type { PublicCourseWithDetails } from '@/services/publicCourses';

interface ScheduleDayListProps {
  courses: PublicCourseWithDetails[];
  studioSlug: string;
}

const WEEKDAYS = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'] as const;
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'] as const;

function extractTimeValue(timeSchedule: string | null): number {
  if (!timeSchedule) return 9999;
  const match = timeSchedule.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 9999;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

/**
 * Pick the display date for a course — next upcoming session for series,
 * start_date for one-offs.
 */
function getDisplayDate(course: PublicCourseWithDetails): string | null {
  return course.next_session?.session_date ?? course.start_date ?? null;
}

function formatDayHeading(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'I dag';
  if (diff === 1) return 'I morgen';
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

interface DayBucket {
  dateStr: string;
  courses: PublicCourseWithDetails[];
}

export function ScheduleDayList({ courses, studioSlug }: ScheduleDayListProps) {
  const buckets = useMemo<DayBucket[]>(() => {
    const map = new Map<string, PublicCourseWithDetails[]>();
    for (const c of courses) {
      const day = getDisplayDate(c);
      if (!day) continue;
      const arr = map.get(day);
      if (arr) arr.push(c);
      else map.set(day, [c]);
    }
    const out: DayBucket[] = Array.from(map.entries()).map(([dateStr, list]) => ({
      dateStr,
      courses: list.slice().sort((a, b) => extractTimeValue(a.time_schedule) - extractTimeValue(b.time_schedule)),
    }));
    return out.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [courses]);

  if (buckets.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      {buckets.map(bucket => (
        <section key={bucket.dateStr}>
          <h3 className="mb-2 text-xs font-medium tracking-wide uppercase text-muted-foreground">
            {formatDayHeading(bucket.dateStr)}
          </h3>
          <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
            {bucket.courses.map(course => (
              <ScheduleRow
                key={course.id}
                course={course}
                studioSlug={studioSlug}
                displayDate={bucket.dateStr}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
