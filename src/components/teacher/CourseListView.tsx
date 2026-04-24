import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Check, ChevronDown, ImageIcon, Users } from '@/lib/icons';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { SessionScheduleRow } from '@/services/courses';
import type { CourseType } from '@/types/database';

const WEEKDAYS_SHORT = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'] as const;
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

const TYPE_LABEL: Record<CourseType, string> = {
  'course-series': 'Kursrekke',
  'event':         'Arrangement',
  'online':        'Nett',
};

function formatNextSession(sessionDate: string | null | undefined, startTime: string | null | undefined): string {
  if (!sessionDate) return '—';
  const date = new Date(sessionDate);
  if (isNaN(date.getTime())) return '—';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const timePart = startTime ? ` kl. ${startTime}` : '';

  if (diffDays === 0) return `I dag${timePart}`;
  if (diffDays === 1) return `I morgen${timePart}`;

  const weekday = WEEKDAYS_SHORT[date.getDay()];
  const month = MONTHS_SHORT[date.getMonth()];
  return `${weekday} ${date.getDate()}. ${month}${timePart}`;
}

function formatSeriesProgress(totalWeeks: number | null | undefined, courseStartDate: string | null | undefined): string | null {
  if (!totalWeeks || !courseStartDate) return null;
  const start = new Date(courseStartDate);
  if (isNaN(start.getTime())) return null;
  const today = new Date();
  const weeksElapsed = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
  // Course hasn't started yet — show total length so teacher sees the duration.
  // The start date is already in the date row; "Starter uke 1" was tautological.
  if (weeksElapsed < 0) return totalWeeks === 1 ? '1 uke' : `${totalWeeks} uker`;
  const currentWeek = Math.min(weeksElapsed + 1, totalWeeks);
  return `Uke ${currentWeek} av ${totalWeeks}`;
}

function CourseImage({ src, alt, className = '' }: { src?: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const handleError = useCallback(() => setFailed(true), []);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        onError={handleError}
        className={`rounded-lg object-cover shrink-0 bg-muted ${className}`}
      />
    );
  }

  return (
    <div className={`rounded-lg bg-muted flex items-center justify-center shrink-0 ${className}`}>
      <ImageIcon className="size-5 text-disabled-foreground" />
    </div>
  );
}

function formatSignupCount(signups: number, max: number | null): string {
  if (!max) return `${signups} påmeldte`;
  return `${signups}/${max}`;
}

function isCourseFull(signups: number, max: number | null): boolean {
  return max !== null && signups >= max;
}

export function CourseCard({ course }: { course: SessionScheduleRow }) {
  const nextSessionLabel = formatNextSession(course.sessionDate, course.startTime);
  const seriesProgress = course.courseType === 'course-series'
    ? formatSeriesProgress(course.totalWeeks, course.courseStartDate)
    : null;

  // Right-column chip always shows type-derived info for consistency across every row.
  // Series → week progress ("Uke 6 av 8"); others → type label ("Arrangement", "Nett").
  const chipLabel = seriesProgress ?? TYPE_LABEL[course.courseType] ?? 'Kursrekke';

  return (
    <Link
      to={`/teacher/courses/${course.courseId}`}
      className="group block smooth-transition hover:bg-muted/50 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
    >
      <div className="flex items-start gap-3 p-3 md:gap-4">
        <CourseImage
          src={course.imageUrl}
          alt={course.courseTitle}
          className="h-12 w-20 md:h-14 md:w-24 shrink-0"
        />

        {/* Two-column layout: title/date on the left, capacity/chip on the right.
            Left-edge aligned top-down: title → date.
            Right-edge aligned top-down: capacity → chip. */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {/* Row 1: Title (left) + Capacity (right) — primary tier, equal importance.
              Full-course pill uses the success token so a teacher scanning the list
              picks up "this one hit capacity" in one visual hit instead of reading
              "Fullt" next to every row's users icon. */}
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-foreground truncate flex-1 min-w-0">
              {course.courseTitle}
            </h3>
            {isCourseFull(course.signupsCount, course.maxParticipants) ? (
              <Badge variant="success" shape="rect" size="sm" className="gap-1 shrink-0">
                <Check className="size-3.5" />
                Fullt
              </Badge>
            ) : (
              <span className="flex items-center gap-1.5 text-sm font-medium tabular-nums text-foreground whitespace-nowrap shrink-0">
                <Users className="size-4 shrink-0" />
                {formatSignupCount(course.signupsCount, course.maxParticipants)}
              </span>
            )}
          </div>

          {/* Row 2: Date (left, under title) + chips (right, under capacity) — meta tier. */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground flex-1 min-w-0">
              <CalendarDays className="size-3.5 shrink-0" />
              <span className="truncate">{nextSessionLabel}</span>
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {course.allowsDropIn && (
                <Badge variant="accent" shape="rect" size="sm">
                  <Check />
                  Drop-in
                </Badge>
              )}
              <Badge variant="secondary" shape="rect" size="sm">
                {chipLabel}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export const COURSES_PER_PAGE = 6;
const ITEMS_PER_PAGE = COURSES_PER_PAGE;

interface CourseListViewProps {
  courses: SessionScheduleRow[];
}

export function CourseListView({ courses }: CourseListViewProps) {
  return (
    <div className="divide-y divide-border">
      {courses.map(c => (
        <motion.div
          key={c.sessionId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          <CourseCard course={c} />
        </motion.div>
      ))}
    </div>
  );
}

type YearState = { expanded: boolean; visibleCount: number };

export function PastCoursesList({ courses }: { courses: SessionScheduleRow[] }) {
  const groups = useMemo(() => {
    const map = new Map<number, SessionScheduleRow[]>();
    for (const c of courses) {
      const dateStr = c.courseEndDate || c.courseStartDate || c.sessionDate;
      if (!dateStr) continue;
      const year = new Date(dateStr).getFullYear();
      if (!Number.isFinite(year)) continue;
      const existing = map.get(year);
      if (existing) existing.push(c);
      else map.set(year, [c]);
    }
    return Array.from(map.entries())
      .map(([year, rows]) => ({ year, rows }))
      .sort((a, b) => b.year - a.year);
  }, [courses]);

  // All years default to collapsed — matches PastSignupsList pattern; teacher clicks to drill in.
  const [state, setState] = useState<Record<number, YearState>>({});

  if (groups.length === 0) return null;

  return (
    <div className="space-y-3">
      {groups.map(g => {
        const s = state[g.year] ?? { expanded: false, visibleCount: ITEMS_PER_PAGE };
        const visible = s.expanded ? g.rows.slice(0, s.visibleCount) : [];
        const hasMore = s.expanded && s.visibleCount < g.rows.length;
        const sectionId = `past-year-${g.year}`;

        return (
          <Card key={g.year} className="gap-0 overflow-hidden p-0">
            <button
              type="button"
              onClick={() =>
                setState(prev => ({
                  ...prev,
                  [g.year]: {
                    expanded: !(prev[g.year]?.expanded ?? false),
                    visibleCount: prev[g.year]?.visibleCount ?? ITEMS_PER_PAGE,
                  },
                }))
              }
              aria-expanded={s.expanded}
              aria-controls={sectionId}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left smooth-transition hover:bg-muted/50 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
            >
              <div className="flex items-center gap-2">
                <ChevronDown
                  className={cn(
                    'size-4 shrink-0 text-muted-foreground transition-transform',
                    !s.expanded && '-rotate-90',
                  )}
                />
                <span className="text-sm font-medium font-mono tabular-nums text-foreground">{g.year}</span>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                {g.rows.length} kurs
              </span>
            </button>

            {s.expanded && (
              <div id={sectionId} className="border-t border-border divide-y divide-border">
                {visible.map(c => (
                  <motion.div
                    key={c.sessionId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <CourseCard course={c} />
                  </motion.div>
                ))}
                {hasMore && (
                  <div className="flex justify-center p-3">
                    <Button
                      variant="outline-soft"
                      size="sm"
                      onClick={() =>
                        setState(prev => ({
                          ...prev,
                          [g.year]: {
                            expanded: true,
                            visibleCount: (prev[g.year]?.visibleCount ?? ITEMS_PER_PAGE) + ITEMS_PER_PAGE,
                          },
                        }))
                      }
                    >
                      Vis flere
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export function CourseListSkeleton() {
  return (
    <div className="divide-y divide-border">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 md:gap-4">
          <Skeleton className="h-12 w-20 md:h-14 md:w-24 rounded-lg shrink-0" />
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <div className="flex items-baseline gap-3">
              <Skeleton className="h-4 w-48 max-w-full flex-1" />
              <Skeleton className="h-4 w-12 shrink-0" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-32 flex-1" />
              <Skeleton className="h-5 w-24 shrink-0" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
