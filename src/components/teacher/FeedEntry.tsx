import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * One row of a date-grouped feed: [date | content]. Date labels sit in a
 * fixed left column; with `stackedDate`, that column collapses below `sm`
 * and a single-line label renders above the content instead. Shared by the
 * course Kursplan feed and the Timeplan page — edit here and both update.
 *
 * Formerly TimelineEntry: the dot-and-line rail was dropped 2026-07-19 —
 * production schedule surfaces (Time2book, Calendly, Cal.com) group by date
 * labels alone; rails belong to progress/step UIs, not agendas.
 */
export function FeedEntry({
  date,
  stackedDate,
  isLast = false,
  className,
  contentClassName,
  children,
}: {
  /** Date-column content, left-aligned. */
  date?: ReactNode;
  /** Single-line date variant rendered ABOVE the content on narrow viewports.
   *  When provided, the date column collapses below `sm` and the content goes
   *  full-width — only where the date sits changes. */
  stackedDate?: ReactNode;
  isLast?: boolean;
  /** Override the grid template (e.g. a wider date column). */
  className?: string;
  /** Override the content cell (e.g. deeper padding between day groups). */
  contentClassName?: string;
  children: ReactNode;
}) {
  const stacked = stackedDate != null;
  return (
    <div
      className={cn(
        'grid grid-cols-[56px_1fr] gap-x-4',
        stacked && 'max-sm:grid-cols-[1fr]',
        className,
      )}
    >
      <div className={cn('pt-3 text-left', stacked && 'max-sm:hidden')}>{date}</div>
      <div className={cn('min-w-0', !isLast && 'pb-3', contentClassName)}>
        {stacked && <div className="mb-2 sm:hidden">{stackedDate}</div>}
        {children}
      </div>
    </div>
  );
}
