import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedTab<T extends string> {
  key: T;
  label: string;
  /** Optional inline count rendered tabular-nums next to the label. */
  count?: number;
  /** Optional node rendered after the label (e.g. a savings-nudge badge). */
  trailing?: ReactNode;
}

interface SegmentedTabsProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  tabs: SegmentedTab<T>[];
  ariaLabel?: string;
  className?: string;
  /** Stretch the control to fill its container; each tab gets equal width. */
  stretch?: boolean;
  /** Control height. 'md' = 36px track; 'lg' (default) = 44px track for
   *  generous, form-first surfaces (e.g. the course builder). */
  size?: 'md' | 'lg';
  /** Freeze the control while a selection is being applied — buttons stop
   *  firing onChange and are dimmed + marked aria-disabled. */
  disabled?: boolean;
  /** ARIA pattern: 'tablist' (default) for switching between views, or
   *  'radiogroup' for a mutually-exclusive value choice (e.g. account type). */
  role?: 'tablist' | 'radiogroup';
}

/**
 * Inline segmented control — muted track, active pill flips to bg-background
 * + soft shadow. Shared across /teacher/courses, /signups, /schedule, and
 * the course detail tab bar so the dashboard reads as one system.
 */
export function SegmentedTabs<T extends string>({
  value,
  onChange,
  tabs,
  ariaLabel,
  className,
  stretch = false,
  size = 'lg',
  disabled = false,
  role = 'tablist',
}: SegmentedTabsProps<T>) {
  const isTablist = role === 'tablist';
  const itemRole = isTablist ? 'tab' : 'radio';

  // Roving tabindex for both modes (WAI-ARIA tabs + radio-group patterns):
  // one tab stop; arrows move focus AND select (auto-activation, matching
  // page-tabs.tsx). Tablist takes Left/Right; radiogroup also takes Up/Down
  // (radios rove on both axes). Home/End jump to first/last in both modes.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const { key } = event;
    const isPrev = key === 'ArrowLeft' || (!isTablist && key === 'ArrowUp');
    const isNext = key === 'ArrowRight' || (!isTablist && key === 'ArrowDown');
    if (!isPrev && !isNext && key !== 'Home' && key !== 'End') return;

    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        `[role="${itemRole}"]:not(:disabled)`,
      ),
    );
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex: number;
    if (key === 'Home') {
      nextIndex = 0;
    } else if (key === 'End') {
      nextIndex = items.length - 1;
    } else {
      const delta = isNext ? 1 : -1;
      nextIndex = ((currentIndex === -1 ? 0 : currentIndex) + delta + items.length) % items.length;
    }

    event.preventDefault();
    const next = items[nextIndex];
    next.focus();
    next.click();
  };

  return (
    <div
      role={role}
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn(
        'items-center rounded-full bg-muted p-1 gap-1',
        size === 'lg' ? 'h-11' : 'h-9',
        stretch ? 'flex w-full' : 'inline-flex w-fit',
        disabled && 'opacity-60',
        className,
      )}
    >
      {tabs.map(t => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role={itemRole}
            aria-selected={isTablist ? active : undefined}
            aria-checked={isTablist ? undefined : active}
            aria-disabled={disabled || undefined}
            disabled={disabled}
            tabIndex={active ? 0 : -1}
            onClick={() => { if (!disabled) onChange(t.key); }}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors',
              size === 'lg' ? 'h-9 px-4' : 'h-7 px-3',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring',
              disabled && 'cursor-not-allowed',
              stretch && 'flex-1',
              active ? 'bg-surface text-foreground shadow-xs' : 'text-foreground',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="tabular-nums text-sm text-foreground">
                {t.count}
              </span>
            )}
            {t.trailing}
          </button>
        );
      })}
    </div>
  );
}
