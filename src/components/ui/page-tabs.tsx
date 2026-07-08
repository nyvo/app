import { cn } from '@/lib/utils';

interface PageTabsProps {
  /** Screen-reader label for the tablist (e.g. "Kursseksjoner"). */
  ariaLabel: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Underline tab strip with neutral-badge active state.
 *
 * Visual pattern: each tab is a small "chip" (rounded muted fill on the
 * active one) sitting on a bottom border. The active tab gets both the
 * underline and the badge — double signal, gentle hierarchy; a deliberate,
 * sanctioned exception to the "no boxed tabs" rule (kept 2026-07-07 after
 * an audit proposed removing it). Used as the top-level section switcher
 * on teacher pages.
 *
 * Container handles role + gap + bottom border + tablist keyboard support
 * (arrow keys move focus and activate — auto-activation pattern, required
 * because PageTab uses roving tabindex so inactive tabs are otherwise
 * unreachable by keyboard). Drop `<PageTab>` children inside.
 */
export function PageTabs({ ariaLabel, className, children }: PageTabsProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const { key } = event;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') return;

    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'),
    );
    if (tabs.length === 0) return;

    const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex: number;
    if (key === 'Home') {
      nextIndex = 0;
    } else if (key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      const delta = key === 'ArrowRight' ? 1 : -1;
      nextIndex = ((currentIndex === -1 ? 0 : currentIndex) + delta + tabs.length) % tabs.length;
    }

    event.preventDefault();
    const next = tabs[nextIndex];
    next.focus();
    // Auto-activation: selection follows focus, matching PageTab's onClick.
    next.click();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn('flex gap-6 border-b border-border overflow-x-auto no-scrollbar', className)}
    >
      {children}
    </div>
  );
}

interface PageTabProps {
  active: boolean;
  onClick: () => void;
  /** Optional inline count chip (e.g., participant count on the Påmeldte tab). */
  count?: number;
  children: React.ReactNode;
  /** ID for the trigger element — used to link aria-controls on the panel. */
  id?: string;
  /** ID of the panel this tab controls. */
  ariaControls?: string;
}

export function PageTab({
  active,
  onClick,
  count,
  children,
  id,
  ariaControls,
}: PageTabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={ariaControls}
      id={id}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={cn(
        'group/tab inline-flex items-center py-1.5 -mb-px text-sm border-b-2 transition-colors outline-none focus-visible:text-foreground',
        active
          ? 'font-medium text-foreground border-foreground'
          : 'font-normal text-foreground-muted hover:text-foreground border-transparent',
      )}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 group-focus-visible/tab:ring-2 group-focus-visible/tab:ring-ring',
          active && 'bg-muted',
        )}
      >
        {children}
        {typeof count === 'number' && count > 0 && (
          <span
            className={cn(
              'inline-flex items-center px-1.5 py-px text-foreground text-xs tabular-nums rounded-full',
              // Inverted bg so the count stays visible against either tab state.
              active ? 'bg-background' : 'bg-muted',
            )}
          >
            {count}
          </span>
        )}
      </span>
    </button>
  );
}
