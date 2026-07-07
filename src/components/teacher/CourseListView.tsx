import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, ChevronUp } from '@/lib/icons';
import { motion } from 'framer-motion';
import { cn, formatKroner } from '@/lib/utils';
import { StatusBadge, type CourseStatus } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { SessionScheduleRow } from '@/services/courses';
import type { CourseFormat, DeliveryMode } from '@/types/database';
import { routes } from '@/lib/routes';

/**
 * Course-type marker — Linear's label pattern: a small bright pill + muted
 * text. The pill carries the categorical hue (--category-* tokens: legend
 * semantics like calendar event colors, NOT status), pastel-bright so it
 * reads instantly while the table stays calm at any row count.
 */
const TYPE_MARKER: Record<'series' | 'single' | 'online', { label: string; dot: string }> = {
  series: { label: 'Kursrekke', dot: 'bg-category-1' },
  single: { label: 'Enkelttime', dot: 'bg-category-2' },
  online: { label: 'Nettkurs', dot: 'bg-category-3' },
};

function typeMarker(format: CourseFormat, delivery: DeliveryMode) {
  if (delivery === 'online') return TYPE_MARKER.online;
  return TYPE_MARKER[format] ?? TYPE_MARKER.single;
}

/**
 * Publish-state badge — silent on the healthy states (upcoming/active, i.e.
 * Publisert); only renders for states the teacher might need to notice.
 * Label + presentation delegate to StatusBadge so status copy stays centralized.
 */
function StatusBadgeRow({ courseStatus }: { courseStatus: string }) {
  if (courseStatus !== 'draft' && courseStatus !== 'cancelled' && courseStatus !== 'completed') return null;
  return <StatusBadge status={courseStatus as CourseStatus} />;
}

export const COURSES_PER_PAGE = 6;

// ─── Table primitives ───────────────────────────────────────────────────
// Borderless flat-table pattern: column headers + hairline-divided rows,
// no card chrome. Each metric column has a fixed width so values align left
// under their header (not right-justified). Sort lives on the column headers
// themselves (canonical Stripe/Linear/Notion 2025 pattern) — no separate
// sort dropdown in the toolbar.

export type SortKey = 'name' | 'next' | 'signups' | 'price';
export type SortDir = 'asc' | 'desc';

const COLS = 'grid grid-cols-[minmax(0,1fr)_100px_80px] items-center gap-6 md:grid-cols-[minmax(0,1fr)_120px_120px_120px]';

interface TableHeaderProps {
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}

function SortableHeader({
  label,
  columnKey,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  columnKey: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = sortKey === columnKey;
  const Arrow = sortDir === 'asc' ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={() => onSort(columnKey)}
      aria-label={`Sorter etter ${label}`}
      aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn(
        'inline-flex items-center gap-1 text-left text-sm text-foreground-muted outline-none transition-colors',
        'hover:text-foreground focus-visible:text-foreground',
        className,
      )}
    >
      {label}
      {isActive && <Arrow className="size-3.5 shrink-0" aria-hidden="true" />}
    </button>
  );
}

function TableHeader({ sortKey, sortDir, onSort }: TableHeaderProps) {
  return (
    <div className={cn(COLS, 'py-3 border-b border-border-subtle')}>
      <SortableHeader label="Navn" columnKey="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
      <span className="text-sm text-foreground-muted">Status</span>
      <SortableHeader label="Påmeldte" columnKey="signups" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="hidden md:inline-flex" />
      <SortableHeader label="Pris" columnKey="price" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
    </div>
  );
}

function TableRow({ course }: { course: SessionScheduleRow }) {
  const roster = course.maxParticipants
    ? `${course.signupsCount} / ${course.maxParticipants}`
    : `${course.signupsCount}`;

  return (
    <Link
      to={routes.course(course.courseId)}
      className={cn(
        COLS,
        'group relative py-4 no-underline outline-none transition-colors hover:bg-hover focus-visible:bg-hover',
      )}
    >
      <div className="min-w-0">
        <h3 className="truncate text-base font-medium text-foreground">{course.courseTitle}</h3>
        {(() => {
          const { label, dot } = typeMarker(course.courseFormat, course.deliveryMode);
          return (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground-muted">
              <span className={cn('h-2 w-3.5 shrink-0 rounded-full', dot)} aria-hidden="true" />
              {label}
            </p>
          );
        })()}
      </div>
      <div>
        <StatusBadgeRow courseStatus={course.courseStatus} />
      </div>
      <span className="hidden whitespace-nowrap text-base text-foreground tabular-nums md:inline">
        {roster}
      </span>
      <span className="whitespace-nowrap text-base text-foreground tabular-nums">
        {formatKroner(course.price)}
      </span>
      <ChevronRight
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-foreground-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </Link>
  );
}

function TableBody({ courses }: { courses: SessionScheduleRow[] }) {
  return (
    <div className="divide-y divide-border-subtle">
      {courses.map((c) => (
        <motion.div
          key={c.sessionId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          <TableRow course={c} />
        </motion.div>
      ))}
    </div>
  );
}

// ─── Public component ───────────────────────────────────────────────────

interface CourseListViewProps {
  courses: SessionScheduleRow[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  /** Rendered in place of the body when `courses` is empty. The header stays
   * visible so the table structure doesn't disappear between tab switches. */
  emptyState?: ReactNode;
}

export function CourseListView({ courses, sortKey, sortDir, onSort, emptyState }: CourseListViewProps) {
  return (
    <div className="overflow-hidden">
      <TableHeader sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
      {courses.length === 0 && emptyState ? (
        <div>{emptyState}</div>
      ) : (
        <TableBody courses={courses} />
      )}
    </div>
  );
}

export function CourseListSkeleton() {
  return (
    <div className="overflow-hidden">
      <div className={cn(COLS, 'py-3 border-b border-border-subtle text-sm text-foreground-muted')}>
        <span>Navn</span>
        <span>Status</span>
        <span className="hidden md:inline">Påmeldte</span>
        <span>Pris</span>
      </div>
      <div className="divide-y divide-border-subtle">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={cn(COLS, 'py-4')}>
            <div className="min-w-0">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="mt-1.5 h-3 w-24 max-w-full" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="hidden h-4 w-16 md:inline-block" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
