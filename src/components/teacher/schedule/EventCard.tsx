import { cn } from '@/lib/utils';
import type { ScheduleEvent } from './types';
import { formatTime, getEventStyle } from './utils';

interface EventCardProps {
  event: ScheduleEvent;
  isSelected?: boolean;
  onSelect?: (event: ScheduleEvent) => void;
  columnIndex?: number;
  columnCount?: number;
}

/**
 * Monochrome event card with three height tiers, each chosen so the content
 * always fits inside the card — never bleeds past its bottom edge.
 *
 *   • Ultra-compact (< 50px or narrow column): single line — title + start time.
 *   • Compact (50–84px): title on top, time + capacity count on second line.
 *     Bar dropped — count carries the "X/Y" signal in tabular nums.
 *   • Full (≥ 85px): title + time stacked, then a 2px capacity bar + count
 *     pinned to the bottom.
 *
 * Surface variants:
 *   • Active (Pågår nå) → bg-foreground text-background — strongest mono
 *     signal, used sparingly (max one event at a time).
 *   • Completed → bg-muted, muted text — calm, archived.
 *   • Upcoming → bg-card border border-border (default).
 */
export function EventCard({ event, isSelected, onSelect, columnIndex = 0, columnCount = 1 }: EventCardProps) {
  const positionStyle = getEventStyle(event.startTime, event.endTime, columnIndex, columnCount);
  const isCompleted = event.status === 'completed';
  const isActive = event.status === 'active';

  const heightPx = parseFloat(positionStyle.height);
  const isNarrow = columnCount > 1;
  const isUltraCompact = isNarrow || heightPx < 50;
  const showFull = !isUltraCompact && heightPx >= 85;
  const showCompact = !isUltraCompact && !showFull;

  const hasMax = event.maxCapacity !== null && event.maxCapacity > 0;
  const pct = hasMax ? Math.min(100, Math.round((event.signups / (event.maxCapacity as number)) * 100)) : 0;
  const capLabel = hasMax
    ? `${event.signups}/${event.maxCapacity}`
    : `${event.signups}`;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(event)}
      aria-label={`${event.title}, ${formatTime(event.startTime)}–${formatTime(event.endTime)}`}
      className={cn(
        'group absolute flex flex-col rounded-md text-left outline-none cursor-pointer overflow-hidden',
        'transition-colors duration-100',
        // Tier-aware padding so compact cards don't waste vertical space
        showFull ? 'p-2' : isUltraCompact ? 'px-1.5 py-1' : 'px-2 py-1.5',
        // Surface
        isActive
          ? 'bg-foreground text-background border border-foreground'
          : isCompleted
            ? 'bg-muted text-muted-foreground border border-transparent'
            : 'bg-card border border-border hover:border-foreground/40',
        // Selection ring
        isSelected && 'ring-2 ring-offset-1 ring-offset-background ring-foreground',
        // Focus
        'focus-visible:ring-2 focus-visible:ring-foreground/60',
      )}
      style={positionStyle}
    >
      {isUltraCompact ? (
        /* Ultra: single inline row — title + start time */
        <div className="flex items-center gap-1.5 min-w-0">
          <p className={cn(
            'text-xs font-medium truncate min-w-0',
            isActive ? 'text-background' : isCompleted ? 'text-muted-foreground' : 'text-foreground',
          )}>
            {event.title}
          </p>
          <span className={cn(
            'text-[11px] tabular-nums shrink-0',
            isActive ? 'text-background/70' : 'text-muted-foreground',
          )}>
            {formatTime(event.startTime)}
          </span>
        </div>
      ) : showCompact ? (
        /* Compact: title + (time · capacity) on one row each. No bar. */
        <>
          <div className="flex items-start justify-between gap-1.5 min-w-0">
            <p className={cn(
              'text-xs font-medium leading-[1.3] truncate min-w-0',
              isActive ? 'text-background' : isCompleted ? 'text-muted-foreground' : 'text-foreground',
            )}>
              {event.title}
            </p>
            {isActive && (
              <span className="text-[10px] font-semibold text-background/85 shrink-0">
                Pågår
              </span>
            )}
          </div>
          <div className={cn(
            'flex items-baseline justify-between gap-2 mt-0.5 min-w-0',
            isActive ? 'text-background/70' : 'text-muted-foreground',
          )}>
            <span className="text-[11px] tabular-nums truncate">
              {formatTime(event.startTime)} – {formatTime(event.endTime)}
            </span>
            {hasMax && (
              <span className="text-[11px] font-medium tabular-nums shrink-0">
                {capLabel}
              </span>
            )}
          </div>
        </>
      ) : (
        /* Full: title + time on top, capacity bar pinned to the bottom */
        <>
          <div className="flex items-start justify-between gap-1.5">
            <p className={cn(
              'text-xs font-medium leading-[1.3] truncate min-w-0',
              isActive ? 'text-background' : isCompleted ? 'text-muted-foreground' : 'text-foreground',
            )}>
              {event.title}
            </p>
            {isActive && (
              <span className="text-[10px] font-semibold text-background/85 shrink-0">
                Pågår nå
              </span>
            )}
          </div>
          <p className={cn(
            'text-[11px] tabular-nums leading-[1.3] mt-0.5',
            isActive ? 'text-background/70' : 'text-muted-foreground',
          )}>
            {formatTime(event.startTime)} – {formatTime(event.endTime)}
          </p>

          {hasMax && (
            <div className="mt-auto pt-1.5 flex flex-col gap-0.5">
              <div className={cn(
                'h-[2px] rounded-full overflow-hidden',
                isActive ? 'bg-background/20' : 'bg-muted',
              )}>
                <div
                  className={cn(
                    'h-full rounded-full',
                    isActive ? 'bg-background/85' : isCompleted ? 'bg-disabled-foreground' : 'bg-muted-foreground',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={cn(
                'text-[10px] tabular-nums',
                isActive ? 'text-background/70' : 'text-muted-foreground',
              )}>
                {capLabel}
              </span>
            </div>
          )}
        </>
      )}
    </button>
  );
}
