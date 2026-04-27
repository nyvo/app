import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ImageIcon } from '@/lib/icons';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
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
  'online':        'Nettkurs',
};

function formatNextSession(sessionDate: string | null | undefined, startTime: string | null | undefined): string {
  if (!sessionDate) return '';
  const date = new Date(sessionDate);
  if (isNaN(date.getTime())) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const timePart = startTime ? ` · ${startTime}` : '';

  if (diffDays === 0) return `I dag${timePart}`;
  if (diffDays === 1) return `I morgen${timePart}`;

  const weekday = WEEKDAYS_SHORT[date.getDay()];
  const month = MONTHS_SHORT[date.getMonth()];
  return `${weekday} ${date.getDate()}. ${month}${timePart}`;
}

function formatSeriesProgress(courseType: CourseType, totalWeeks: number | null | undefined, courseStartDate: string | null | undefined): string | null {
  if (courseType !== 'course-series') {
    return courseType === 'event' ? 'enkelttime' : null;
  }
  if (!totalWeeks) return null;
  if (!courseStartDate) return totalWeeks === 1 ? '1 uke' : `${totalWeeks} uker`;
  const start = new Date(courseStartDate);
  if (isNaN(start.getTime())) return `${totalWeeks} uker`;
  const today = new Date();
  const weeksElapsed = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
  if (weeksElapsed < 0) return totalWeeks === 1 ? '1 uke' : `${totalWeeks} uker`;
  const currentWeek = Math.min(weeksElapsed + 1, totalWeeks);
  return `uke ${currentWeek} av ${totalWeeks}`;
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
        className={`rounded-md object-cover shrink-0 bg-muted ${className}`}
      />
    );
  }

  return (
    <div className={`rounded-md bg-muted flex items-center justify-center shrink-0 ${className}`}>
      <ImageIcon className="size-5 text-disabled-foreground" />
    </div>
  );
}

type CourseCardStatus = 'active' | 'full' | 'draft' | 'cancelled';

function deriveStatus(courseStatus: string, signups: number, max: number | null): CourseCardStatus {
  if (courseStatus === 'draft') return 'draft';
  if (courseStatus === 'cancelled') return 'cancelled';
  if (max !== null && signups >= max) return 'full';
  return 'active';
}

function statusLabel(status: CourseCardStatus): string {
  switch (status) {
    case 'full': return 'Fullt';
    case 'draft': return 'Utkast';
    case 'cancelled': return 'Avlyst';
    default: return 'Aktiv';
  }
}

/**
 * Status pill — fully monochrome. `Fullt` is the only filled treatment
 * (strongest signal) so a teacher scanning the list catches the row that's
 * sold out. Other states use muted-on-muted.
 */
function StatusPill({ status }: { status: CourseCardStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium leading-[1.5]',
        status === 'full' && 'bg-foreground text-background',
        status === 'active' && 'bg-muted text-foreground',
        status === 'draft' && 'bg-muted text-muted-foreground',
        status === 'cancelled' && 'bg-muted text-muted-foreground line-through',
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

export function CourseCard({ course }: { course: SessionScheduleRow }) {
  const status = deriveStatus(course.courseStatus, course.signupsCount, course.maxParticipants);
  const sequence = formatSeriesProgress(course.courseType, course.totalWeeks, course.courseStartDate);
  const nextSession = status === 'draft' ? '' : formatNextSession(course.sessionDate, course.startTime);

  // Meta line: date · time · location · sequence — single tier, muted.
  // Drafts skip date+time; status pill carries that signal instead.
  const metaParts: string[] = [];
  if (nextSession) metaParts.push(nextSession);
  if (course.location) metaParts.push(course.location);
  if (sequence) metaParts.push(sequence);
  if (metaParts.length === 0 && status === 'draft') {
    metaParts.push(TYPE_LABEL[course.courseType] ?? '');
  }

  // Capacity readouts
  const hasMax = course.maxParticipants !== null && course.maxParticipants > 0;
  const pct = hasMax ? Math.min(100, Math.round((course.signupsCount / (course.maxParticipants as number)) * 100)) : 0;
  const showBar = status !== 'draft' && status !== 'cancelled' && hasMax;

  return (
    <Link
      to={`/teacher/courses/${course.courseId}`}
      className="group block smooth-transition hover:bg-muted/50 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
    >
      <div className="grid items-center gap-4 p-3 md:gap-5 md:p-4 grid-cols-[56px_1fr] md:grid-cols-[56px_minmax(0,1fr)_180px]">
        <CourseImage
          src={course.imageUrl}
          alt={course.courseTitle}
          className="h-14 w-14 md:h-14 md:w-14"
        />

        {/* Identity cluster — title (+ drop-in marker inline) on top, muted meta line below */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-medium text-foreground leading-[1.35] truncate min-w-0">
              {course.courseTitle}
            </h3>
            {course.allowsDropIn && (
              <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium leading-[1.45] group-hover:bg-background">
                Drop-in
              </span>
            )}
          </div>
          {metaParts.length > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums truncate">
              {metaParts.map((p, i) => (
                <span key={i}>
                  {i > 0 && <span className="text-disabled-foreground"> · </span>}
                  {p}
                </span>
              ))}
            </p>
          )}
        </div>

        {/* Status / capacity cluster — desktop only, vertically centered with the identity column */}
        <div className="hidden md:flex flex-col justify-center gap-1.5 self-center w-full">
          <div className="flex items-center justify-between gap-2 text-xs tabular-nums leading-none">
            <StatusPill status={status} />
            {status === 'draft' ? (
              <span className="text-muted-foreground">Ikke publisert</span>
            ) : status === 'cancelled' ? (
              <span className="text-muted-foreground">Avlyst</span>
            ) : hasMax ? (
              <span>
                <span className="text-foreground">{course.signupsCount}/{course.maxParticipants}</span>
                <span className="text-muted-foreground"> · {pct} %</span>
              </span>
            ) : (
              <span>
                <span className="text-foreground">{course.signupsCount} påmeldte</span>
                <span className="text-muted-foreground"> · ubegrenset</span>
              </span>
            )}
          </div>
          {showBar && (
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden group-hover:bg-background">
              <div
                className="h-full rounded-full bg-muted-foreground"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
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
                <span className="text-sm font-medium tabular-nums text-foreground">{g.year}</span>
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
        <div key={i} className="grid items-center gap-4 p-3 md:gap-5 md:p-4 grid-cols-[56px_1fr] md:grid-cols-[56px_minmax(0,1fr)_180px]">
          <Skeleton className="h-14 w-14 rounded-md shrink-0" />
          <div className="min-w-0 flex flex-col gap-1.5">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <div className="hidden md:flex flex-col gap-1.5 self-center">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-1 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
