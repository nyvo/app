import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * One row of a timeline feed: [date | rail | content]. The rail draws hairline
 * segments above/below its dot so the line reads continuous across rows but
 * starts at the first dot and closes at the last. Shared by the course
 * Kursplan feed and the Timeplan page — edit here and both update.
 */
export function TimelineEntry({
  date,
  rail,
  next = false,
  lineAbove = false,
  lineBelow = false,
  isLast = false,
  className,
  contentClassName,
  children,
}: {
  /** Date-column content, left-aligned. */
  date?: ReactNode;
  /** A lone entry needs no timeline — the rail only earns its place between
   *  entries. The grid columns stay, so content never shifts x. */
  rail: boolean;
  /** Bright success green = the one semantic emphasis on the rail: "this is
   *  the next session". Everything else stays neutral. */
  next?: boolean;
  lineAbove?: boolean;
  lineBelow?: boolean;
  isLast?: boolean;
  /** Override the grid template (e.g. a wider date column). */
  className?: string;
  /** Override the content cell (e.g. deeper padding between day groups). */
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('grid grid-cols-[56px_18px_1fr] gap-x-2.5', className)}>
      <div className="pt-3 text-left">{date}</div>
      <div className="relative flex justify-center">
        {rail && (
          <>
            {lineAbove && (
              <span aria-hidden="true" className="absolute top-0 h-[17px] w-px bg-border-subtle" />
            )}
            {lineBelow && (
              <span
                aria-hidden="true"
                className="absolute bottom-0 top-[25px] w-px bg-border-subtle"
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                'mt-[17px] size-2 shrink-0 rounded-full',
                next
                  ? 'bg-success-bright ring-[3px] ring-success-bright/20'
                  : 'bg-border-strong',
              )}
            />
          </>
        )}
      </div>
      <div className={cn('min-w-0', !isLast && 'pb-3', contentClassName)}>{children}</div>
    </div>
  );
}
