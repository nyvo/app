import { cn } from '@/lib/utils';

interface PublicCardProps {
  header: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * Public-page decision card (2026-07-20): one bordered `rounded-2xl`
 * container with a 6px inset; the header is its own `bg-muted rounded-lg`
 * band inside, the body is white. Replaces both `FramedCard` (card-in-card)
 * and the shadowed focal card on the public course + checkout pages. Band
 * text stays full `text-foreground` (muted-on-muted rule).
 */
export function PublicCard({ header, children, className, bodyClassName }: PublicCardProps) {
  return (
    <div className={cn('rounded-2xl border border-border-card bg-surface p-1.5', className)}>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-sm font-medium text-foreground">
        {header}
      </div>
      <div className={cn('px-3 pb-3 pt-4', bodyClassName)}>{children}</div>
    </div>
  );
}
