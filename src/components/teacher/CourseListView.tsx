import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, ChevronUp } from '@/lib/icons';
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
    <div
      role="columnheader"
      aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={className}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        aria-label={`Sorter etter ${label}`}
        className="group inline-flex items-center gap-1 rounded text-left text-sm text-foreground-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
        {isActive ? (
          <Arrow className="size-3.5 shrink-0" aria-hidden="true" />
        ) : (
          // Hover-ghost cue — distinguishes the sortable columns from the
          // plain (non-sortable) Status header.
          <ChevronDown
            className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          />
        )}
      </button>
    </div>
  );
}

function TableHeader({ sortKey, sortDir, onSort }: TableHeaderProps) {
  return (
    <div role="row" className={cn(COLS, 'py-3 border-b border-border-subtle')}>
      <SortableHeader label="Navn" columnKey="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
      <div role="columnheader" className="text-sm text-foreground-muted">Status</div>
      <SortableHeader label="Påmeldte" columnKey="signups" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
      <SortableHeader label="Pris" columnKey="price" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="hidden md:block" />
    </div>
  );
}

function TableRow({ course, countsUnavailable }: { course: SessionScheduleRow; countsUnavailable?: boolean }) {
  // Counts RPC failed — render `–` rather than a fabricated 0 / N.
  const roster = countsUnavailable
    ? '–'
    : course.maxParticipants
      ? `${course.signupsCount} / ${course.maxParticipants}`
      : `${course.signupsCount}`;

  return (
    <Link
      to={routes.course(course.courseId)}
      role="row"
      className={cn(
        COLS,
        'group relative py-4 no-underline outline-none transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring-subtle',
      )}
    >
      <div role="cell" className="min-w-0">
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
      <div role="cell">
        <StatusBadgeRow courseStatus={course.courseStatus} />
      </div>
      <span role="cell" className="whitespace-nowrap text-base text-foreground tabular-nums">
        {roster}
      </span>
      <span role="cell" className="hidden whitespace-nowrap text-base text-foreground tabular-nums md:inline">
        {formatKroner(course.price)}
      </span>
      <ChevronRight
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-foreground-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </Link>
  );
}

function TableBody({ courses, countsUnavailable }: { courses: SessionScheduleRow[]; countsUnavailable?: boolean }) {
  return (
    <div className="divide-y divide-border-subtle">
      {courses.map((c) => (
        <TableRow key={c.sessionId} course={c} countsUnavailable={countsUnavailable} />
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
  /** When the signup-counts RPC failed, the Påmeldte column reads `–`. */
  countsUnavailable?: boolean;
}

export function CourseListView({ courses, sortKey, sortDir, onSort, emptyState, countsUnavailable }: CourseListViewProps) {
  return (
    <div role="table" className="overflow-hidden">
      <TableHeader sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
      {courses.length === 0 && emptyState ? (
        <div>{emptyState}</div>
      ) : (
        <TableBody courses={courses} countsUnavailable={countsUnavailable} />
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
        <span>Påmeldte</span>
        <span className="hidden md:inline">Pris</span>
      </div>
      <div className="divide-y divide-border-subtle">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={cn(COLS, 'py-4')}>
            <div className="min-w-0">
              <Skeleton className="h-6 w-48 max-w-full" />
              <Skeleton className="mt-1 h-5 w-24 max-w-full" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="hidden h-4 w-16 md:inline-block" />
          </div>
        ))}
      </div>
    </div>
  );
}
