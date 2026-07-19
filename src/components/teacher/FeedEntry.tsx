import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * One row of a date-grouped feed: [date | content], date labels in a fixed
 * left column. Used by the course Kursplan feed (the Timeplan page moved to
 * day headings above the cards — ScheduleDay in SchedulePage).
 *
 * Formerly TimelineEntry: the dot-and-line rail was dropped 2026-07-19 —
 * production schedule surfaces (Time2book, Calendly, Cal.com) group by date
 * labels alone; rails belong to progress/step UIs, not agendas.
 */
export function FeedEntry({
  date,
  isLast = false,
  className,
  contentClassName,
  children,
}: {
  /** Date-column content, left-aligned. */
  date?: ReactNode;
  isLast?: boolean;
  /** Override the grid template (e.g. a wider date column). */
  className?: string;
  /** Override the content cell (e.g. deeper padding between groups). */
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('grid grid-cols-[56px_1fr] gap-x-4', className)}>
      <div className="pt-3 text-left">{date}</div>
      <div className={cn('min-w-0', !isLast && 'pb-3', contentClassName)}>{children}</div>
    </div>
  );
}
