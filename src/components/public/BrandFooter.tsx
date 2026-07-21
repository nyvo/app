import { Link } from 'react-router-dom';
import { UpNextLogo } from '@/components/ui/upnext-logo';
import { cn } from '@/lib/utils';

/**
 * Quiet platform attribution at the bottom of public pages — the logo +
 * wordmark lockup at 60 % opacity, centered. Public pages belong to the
 * studio (no platform header); UpNext signs the page discreetly instead.
 * Ratified on the join page 2026-07-20, extended to the whole public funnel
 * (storefront → course detail → checkout → receipt).
 *
 * Place as the last child of a `flex min-h-* flex-col` shell — `mt-auto`
 * pins it to the viewport bottom when the content is short.
 */
export function BrandFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('mt-auto flex justify-center pb-8 pt-12', className)}>
      <Link
        to="/"
        aria-label="UpNext"
        className="flex select-none items-center gap-2 opacity-60 transition-opacity duration-150 hover:opacity-100"
      >
        <UpNextLogo size="sm" />
        <span className="text-sm font-medium text-foreground">UpNext</span>
      </Link>
    </footer>
  );
}
