import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock } from '@/lib/icons';
import { cn, formatCoursePrice } from '@/lib/utils';
import type { PublicCourseWithDetails } from '@/services/publicCourses';

interface StudioScheduleStripProps {
  courses: PublicCourseWithDetails[];
  /** Viewing storefront — carried as state so the detail back-link returns
   * here even in syndicated cases. */
  viewingSlug?: string;
  viewingName?: string | null;
}

const WEEKDAYS_LONG = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'] as const;
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

function getDisplayDate(course: PublicCourseWithDetails): string | null {
  return course.next_session?.session_date ?? course.start_date ?? null;
}

function extractTime(timeSchedule: string | null): string {
  if (!timeSchedule) return '';
  const m = timeSchedule.match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : '';
}

function extractTimeValue(timeSchedule: string | null): number {
  if (!timeSchedule) return 9999;
  const m = timeSchedule.match(/(\d{1,2}):(\d{2})/);
  if (!m) return 9999;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function formatDayHeading(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const dayName = diff === 0 ? 'I dag' : diff === 1 ? 'I morgen' : WEEKDAYS_LONG[d.getDay()];
  return `${dayName} · ${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}

interface DayBucket {
  dateStr: string;
  courses: PublicCourseWithDetails[];
}

/**
 * Dense, calm chronological schedule for the bottom of the studio page.
 * For users who already know what they want — no imagery, just type +
 * a single fine rule between days. Mirrors the visual logic of a printed
 * timetable.
 */
export function StudioScheduleStrip({ courses, viewingSlug, viewingName }: StudioScheduleStripProps) {
  const buckets = useMemo<DayBucket[]>(() => {
    const map = new Map<string, PublicCourseWithDetails[]>();
    for (const c of courses) {
      const day = getDisplayDate(c);
      if (!day) continue;
      const arr = map.get(day);
      if (arr) arr.push(c);
      else map.set(day, [c]);
    }
    return Array.from(map.entries())
      .map(([dateStr, list]) => ({
        dateStr,
        courses: list.slice().sort((a, b) => extractTimeValue(a.time_schedule) - extractTimeValue(b.time_schedule)),
      }))
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [courses]);

  if (buckets.length === 0) return null;

  return (
    <section className="space-y-8">
      <header className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground">
          Hele timeplanen
        </h2>
        <p className="text-sm text-foreground-muted leading-snug max-w-md">
          Alt som er åpent for påmelding, sortert kronologisk.
        </p>
      </header>

      <div className="divide-y divide-border">
        {buckets.map(bucket => (
          <div key={bucket.dateStr} className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 md:gap-10 py-6">
            <div className="md:pt-2">
              <h3 className="text-sm font-semibold text-foreground">
                {formatDayHeading(bucket.dateStr)}
              </h3>
            </div>
            <div className="divide-y divide-border">
              {bucket.courses.map(course => {
                const time = extractTime(course.time_schedule);
                const studioSlug = course.seller?.slug ?? '';
                const isFull = course.max_participants !== null && course.spots_available <= 0;
                const isCancelled = course.status === 'cancelled';
                const lowSpots = course.max_participants !== null && course.spots_available > 0 && course.spots_available <= 3;
                const instructor = course.instructors[0]?.name ?? course.instructor?.name ?? null;

                return (
                  <Link
                    key={course.id}
                    to={`/${studioSlug}/${course.slug}`}
                    state={{ fromSlug: viewingSlug ?? studioSlug, fromName: viewingName ?? course.seller?.name ?? null }}
                    className={cn(
                      'group flex items-center gap-4 sm:gap-6 py-3 px-2 -mx-2 rounded-md',
                      'transition-colors duration-200',
                      'hover:bg-muted',
                      (isFull || isCancelled) && 'text-foreground-muted',
                    )}
                  >
                    <div className="w-14 shrink-0 text-sm font-medium tabular-nums text-foreground">
                      {time || '—'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-medium text-foreground truncate">
                          {course.title}
                        </span>
                        {isCancelled && (
                          <span className="text-xs font-medium text-foreground-muted border border-border rounded px-1.5 py-0.5">
                            Avlyst
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-x-3 text-xs text-foreground-muted">
                        {instructor && <span className="truncate">{instructor}</span>}
                        {course.location && (
                          <span className="hidden sm:inline truncate">· {course.location}</span>
                        )}
                        {course.format === 'series' && course.total_weeks && (
                          <span className="inline-flex items-center gap-1 text-foreground-disabled">
                            <Clock className="size-3" strokeWidth={1.75} />
                            {course.total_weeks} uker
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end">
                      <span className="text-sm font-medium tabular-nums text-foreground whitespace-nowrap">
                        {formatCoursePrice(course.price)}
                      </span>
                      {lowSpots && !isFull && (
                        <span className="text-xs font-medium text-warning">
                          {course.spots_available} igjen
                        </span>
                      )}
                      {isFull && !isCancelled && (
                        <span className="text-xs font-medium text-foreground-muted">
                          Fullt
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
