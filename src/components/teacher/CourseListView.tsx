import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CalendarDays, ChevronDown, ImageIcon, MapPin } from '@/lib/icons';
import type { LucideIcon } from '@/lib/icons';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { Skeleton } from '@/components/ui/skeleton';
import type { SessionScheduleRow } from '@/services/courses';
import type { CourseType } from '@/types/database';

const WEEKDAYS_SHORT = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'] as const;
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

const TYPE_META: Record<CourseType, { label: string; Icon: LucideIcon }> = {
  'course-series': { label: 'Kursrekke', Icon: BookOpen },
  'event':         { label: 'Arrangement', Icon: BookOpen },
  'online':        { label: 'Nett', Icon: BookOpen },
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
  if (weeksElapsed < 0) return `Starter uke 1`;
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
      <ImageIcon className="size-5 text-muted-foreground/40" />
    </div>
  );
}

function SignupsBlock({ signups, max }: { signups: number; max: number | null }) {
  if (!max) {
    return <span className="text-xs font-medium text-foreground whitespace-nowrap">{signups} påmeldte</span>;
  }
  const isFull = signups >= max;
  const pct = isFull ? 100 : Math.min(100, Math.round((signups / max) * 100));
  return (
    <div className="flex flex-col items-end">
      <span className="text-xs font-medium text-foreground whitespace-nowrap">
        {isFull ? 'Fullt' : `${signups}/${max}`}
      </span>
      <div className="mt-1.5 h-1 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-chart-2"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function CourseCard({ course }: { course: SessionScheduleRow }) {
  const typeMeta = TYPE_META[course.courseType] ?? { label: '', Icon: CalendarDays };
  const nextSessionLabel = formatNextSession(course.sessionDate, course.startTime);
  const seriesProgress = course.courseType === 'course-series'
    ? formatSeriesProgress(course.totalWeeks, course.courseStartDate)
    : null;

  const statusLabel = course.courseStatus === 'draft' ? 'Utkast'
    : course.courseStatus === 'cancelled' ? 'Avlyst'
    : course.courseStatus === 'completed' ? 'Fullført'
    : null;

  return (
    <Link
      to={`/teacher/courses/${course.courseId}`}
      className="group block smooth-transition hover:bg-muted/40 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
    >
      <div className="flex items-start gap-3 p-3 md:gap-4">
        <CourseImage
          src={course.imageUrl}
          alt={course.courseTitle}
          className="size-14 md:size-20"
        />

        <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center md:gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">
              {course.courseTitle}
            </h3>

            <div className="mt-1 flex flex-col gap-0.5 text-xs font-medium tracking-wide text-muted-foreground">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                <span className="flex items-center gap-1.5 shrink-0">
                  <typeMeta.Icon className="size-3.5 shrink-0" />
                  {typeMeta.label}{seriesProgress ? `, ${seriesProgress.toLowerCase()}` : ''}
                </span>
                {course.location && (
                  <span className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{course.location}</span>
                  </span>
                )}
                {statusLabel && (
                  <StatusIndicator
                    variant="neutral"
                    mode="badge"
                    size="sm"
                    label={statusLabel}
                    className="shrink-0"
                  />
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5 shrink-0" />
                <span>{nextSessionLabel}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 md:mt-0 shrink-0 self-start md:self-center">
            <SignupsBlock signups={course.signupsCount} max={course.maxParticipants} />
          </div>
        </div>
      </div>
    </Link>
  );
}

const ITEMS_PER_PAGE = 6;

interface CourseListViewProps {
  courses: SessionScheduleRow[];
}

export function CourseListView({ courses }: CourseListViewProps) {
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const prevCoursesRef = useRef(courses);

  useEffect(() => {
    if (prevCoursesRef.current !== courses) {
      setVisibleCount(ITEMS_PER_PAGE);
      prevCoursesRef.current = courses;
    }
  }, [courses]);

  const visible = courses.slice(0, visibleCount);
  const hasMore = visibleCount < courses.length;

  return (
    <>
      <div className="divide-y divide-border">
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
      </div>
      {hasMore && (
        <div className="flex justify-center p-4">
          <Button
            variant="outline-soft"
            size="sm"
            onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
          >
            Vis flere
          </Button>
        </div>
      )}
    </>
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

  const [state, setState] = useState<Record<number, YearState>>({});

  useEffect(() => {
    setState(prev => {
      const next: Record<number, YearState> = {};
      groups.forEach((g, i) => {
        next[g.year] = prev[g.year] ?? { expanded: i === 0, visibleCount: ITEMS_PER_PAGE };
      });
      return next;
    });
  }, [groups]);

  if (groups.length === 0) return null;

  return (
    <div className="divide-y divide-border">
      {groups.map(g => {
        const s = state[g.year] ?? { expanded: false, visibleCount: ITEMS_PER_PAGE };
        const visible = s.expanded ? g.rows.slice(0, s.visibleCount) : [];
        const hasMore = s.expanded && s.visibleCount < g.rows.length;
        const sectionId = `past-year-${g.year}`;

        return (
          <div key={g.year}>
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
              className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left smooth-transition hover:bg-muted/40 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ChevronDown
                  className={`size-4 text-muted-foreground transition-transform ${s.expanded ? '' : '-rotate-90'}`}
                />
                {g.year}
              </span>
              <Badge variant="secondary" className="text-muted-foreground tracking-wide">
                {g.rows.length} kurs
              </Badge>
            </button>

            {s.expanded && (
              <div id={sectionId}>
                <div className="divide-y divide-border border-t border-border">
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
                </div>
                {hasMore && (
                  <div className="flex justify-center p-4 border-t border-border">
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
          </div>
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
          <Skeleton className="size-14 md:size-20 rounded-lg shrink-0" />
          <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center md:gap-4">
            <div className="flex-1 min-w-0 space-y-1.5">
              <Skeleton className="h-5 w-44 max-w-full" />
              <Skeleton className="h-3 w-32 max-w-full" />
              <Skeleton className="h-4 w-28 max-w-full" />
            </div>
            <div className="mt-3 md:mt-0">
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
