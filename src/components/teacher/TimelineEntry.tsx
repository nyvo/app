import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * One row of a timeline feed: [date | rail | content]. The rail draws line
 * segments above/below its dot so the line reads continuous across rows but
 * starts at the first dot and closes at the last. Shared by the course
 * Kursplan feed and the Timeplan page — edit here and both update.
 *
 * The rail is monochrome: the line and resting dots are neutral ink, and the
 * next-session dot is solid foreground with a soft ink halo — emphasis comes
 * from contrast, not colour.
 */
export function TimelineEntry({
  date,
  stackedDate,
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
  /** Single-line date variant rendered ABOVE the content on narrow viewports.
   *  When provided, the date column collapses below `sm` and the rail moves to
   *  hug the content's left edge — the rail/card relationship never changes,
   *  only where the date sits. */
  stackedDate?: ReactNode;
  /** A lone entry needs no timeline — the rail only earns its place between
   *  entries. The grid columns stay, so content never shifts x. */
  rail: boolean;
  /** Solid ink dot with a soft halo = the one emphasis on the rail: "this is
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
  const stacked = stackedDate != null;
  return (
    <div
      className={cn(
        'grid grid-cols-[56px_18px_1fr] gap-x-2.5',
        stacked && 'max-sm:grid-cols-[18px_1fr]',
        className,
      )}
    >
      <div className={cn('pt-3 text-left', stacked && 'max-sm:hidden')}>{date}</div>
      <div className="relative flex justify-center">
        {rail && (
          <>
            {lineAbove && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-0 h-[17px] w-px bg-border',
                  stacked && 'max-sm:h-[5px]',
                )}
              />
            )}
            {lineBelow && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute bottom-0 top-[25px] w-px bg-border',
                  stacked && 'max-sm:top-[13px]',
                )}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                'mt-[17px] size-2 shrink-0 rounded-full',
                stacked && 'max-sm:mt-[5px]',
                next ? 'bg-foreground ring-[3px] ring-foreground/10' : 'bg-border-strong',
              )}
            />
          </>
        )}
      </div>
      <div className={cn('min-w-0', !isLast && 'pb-3', contentClassName)}>
        {stacked && <div className="mb-2 sm:hidden">{stackedDate}</div>}
        {children}
      </div>
    </div>
  );
}
