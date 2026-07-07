import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * FramedCard — THE grouped-content container: a neutral muted shell forms
 * the header (title left, optional action right); content lives in a white
 * panel inset. No shadows, no borders — hierarchy comes from the fill/white
 * contrast. Used identically on the course-detail overview and the dashboard
 * home, so grouped panels read as one system everywhere.
 *
 * Deliberately neutral: azure fills are reserved for genuine selected /
 * semantic states (chosen booking tier, calendar availability) — never for
 * container chrome (design-language.md §1.2).
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
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl bg-surface">
        {children}
      </div>
    </div>
  );
}
