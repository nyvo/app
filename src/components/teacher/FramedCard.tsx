import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * FramedCard — THE grouped-content container: a neutral muted shell with the
 * title in its header row; content stacks in a gap-1.5 column below. Two
 * content shapes:
 *
 *  - Block content (chart, stat spine, copy + action, map): wrap it in ONE
 *    `<FramedCardPanel>` — the white inset.
 *  - List content (sessions, signups, toggle rows): each item is its OWN
 *    white card (`rounded-xl bg-surface` + padding), stacked with the
 *    column gap. Interactive items do NOT change fill on hover — affordance
 *    comes from cursor, chevron nudge, and the focus ring.
 *
 * Used identically on the dashboard home and the course-detail overview.
 * Deliberately neutral: azure fills are reserved for genuine selected /
 * semantic states — never container chrome (design-language.md §1.2).
 */
export function FramedCard({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col rounded-2xl bg-muted p-2', className)}>
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        {action && <span className="text-sm text-foreground">{action}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-1.5">{children}</div>
    </div>
  );
}

/** The white inset for block content inside a FramedCard. */
export function FramedCardPanel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col overflow-hidden rounded-xl bg-surface',
        className,
      )}
    >
      {children}
    </div>
  );
}
