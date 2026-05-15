import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronDown, ImageIcon, Users } from '@/lib/icons';
import { motion } from 'framer-motion';
import { cn, formatKroner } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { SessionScheduleRow } from '@/services/courses';
import type { CourseFormat, DeliveryMode } from '@/types/database';
import { routes } from '@/lib/routes';

const WEEKDAYS_SHORT = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'] as const;
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

const FORMAT_LABEL: Record<CourseFormat, string> = {
  series: 'Kursrekke',
  single: 'Enkelttime',
};

function typeLabel(format: CourseFormat, delivery: DeliveryMode): string {
  if (delivery === 'online') return 'Nettkurs';
  return FORMAT_LABEL[format];
}

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

function formatSeriesProgress(format: CourseFormat, totalWeeks: number | null | undefined, courseStartDate: string | null | undefined): string | null {
  if (format !== 'series') return null;
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
      <ImageIcon className="size-5 text-foreground-disabled" />
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
        'inline-flex h-5 items-center rounded-full px-2 text-xs font-medium',
        status === 'full' && 'bg-foreground text-background',
        status === 'active' && 'bg-muted text-foreground',
        status === 'draft' && 'bg-muted text-foreground-muted',
        status === 'cancelled' && 'bg-muted text-foreground-muted line-through',
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

export const COURSES_PER_PAGE = 6;
const ITEMS_PER_PAGE = COURSES_PER_PAGE;

/**
 * Horizontal row card — thumbnail left, content middle, price right.
 * Used by the active/draft Mine kurs list. Each card is self-contained
 * (own border + bg-surface) so it reads as catalogue rather than table.
 * See /dev/courses-grid-preview variant B for the reference layout.
 */
export function CourseRowCard({ course }: { course: SessionScheduleRow }) {
  const status = deriveStatus(course.courseStatus, course.signupsCount, course.maxParticipants);
  const sequence = formatSeriesProgress(course.courseFormat, course.totalWeeks, course.courseStartDate);
  const nextSession = status === 'draft' ? '' : formatNextSession(course.sessionDate, course.startTime);

  const hasMax = course.maxParticipants !== null && course.maxParticipants > 0;
  const showStatusPill = status === 'draft' || status === 'full' || status === 'cancelled';

  return (
    <Link
      to={routes.course(course.courseId)}
      className={cn(
        'group block rounded-md outline-none transition-colors',
        'hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50',
      )}
    >
      <article className="flex items-stretch gap-4 py-4 px-2 md:gap-5 md:py-5">
        <CourseImage
          src={course.imageUrl}
          alt={course.courseTitle}
          className="size-20 rounded-lg md:size-28"
        />

        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-medium text-foreground">
                {course.courseTitle}
              </h3>
              {showStatusPill && <StatusPill status={status} />}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-foreground-muted">
              <span>{typeLabel(course.courseFormat, course.deliveryMode)}</span>
              {course.location && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{course.location}</span>
                </>
              )}
              {sequence && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{sequence}</span>
                </>
              )}
              {course.allowsDropIn && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Drop-in</span>
                </>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            <span className="inline-flex items-center gap-1.5 text-foreground-muted">
              <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
              <span className={cn(!nextSession && 'italic')}>
                {nextSession || 'Ingen datoer satt'}
              </span>
            </span>
            {hasMax ? (
              status !== 'full' && (
                <span className="inline-flex items-center gap-1.5 text-foreground-muted">
                  <Users className="size-4 shrink-0" aria-hidden="true" />
                  <span className="tabular-nums">
                    {course.signupsCount} / {course.maxParticipants}
                  </span>
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1.5 text-foreground-muted">
                <Users className="size-4 shrink-0" aria-hidden="true" />
                <span>{course.signupsCount} påmeldt · ubegrenset</span>
              </span>
            )}
          </div>
        </div>

        <div className="hidden shrink-0 items-end justify-end py-0.5 sm:flex">
          <span className="text-sm font-medium tabular-nums text-foreground">
            {formatKroner(course.price)}
          </span>
        </div>
      </article>
    </Link>
  );
}

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
          <CourseRowCard course={c} />
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
    <div className="space-y-6">
      {groups.map(g => {
        const s = state[g.year] ?? { expanded: false, visibleCount: ITEMS_PER_PAGE };
        const visible = s.expanded ? g.rows.slice(0, s.visibleCount) : [];
        const hasMore = s.expanded && s.visibleCount < g.rows.length;
        const sectionId = `past-year-${g.year}`;

        return (
          <section key={g.year} className="space-y-2">
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
              className="flex w-full items-center justify-between gap-3 rounded-md bg-muted px-3 py-2.5 text-left transition-colors duration-150 hover:bg-muted/80 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className="text-lg font-medium tracking-tight tabular-nums text-foreground">
                {g.year}
              </span>
              <ChevronDown
                className={cn(
                  'size-5 shrink-0 text-foreground-muted transition-transform duration-200',
                  s.expanded && 'rotate-180',
                )}
                aria-hidden="true"
              />
            </button>

            {s.expanded && (
              <div id={sectionId} className="divide-y divide-border">
                {visible.map(c => (
                  <motion.div
                    key={c.sessionId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <CourseRowCard course={c} />
                  </motion.div>
                ))}
                {hasMore && (
                  <div className="flex justify-center py-3">
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label="Vis flere"
                      title="Vis flere"
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
                      <ChevronDown />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function CourseListSkeleton() {
  return (
    <div className="divide-y divide-border">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-stretch gap-4 py-4 px-2 md:gap-5 md:py-5"
        >
          <Skeleton className="size-20 shrink-0 rounded-lg md:size-28" />
          <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <div className="hidden shrink-0 items-end justify-end sm:flex">
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
