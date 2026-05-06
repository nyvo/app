import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf } from '@/lib/icons';
import { cn } from '@/lib/utils';

interface PublicNavProps {
  /** Optional studio name shown as a tiny breadcrumb after the brand mark. */
  studioName?: string;
  studioSlug?: string;
  /** When true, nav is transparent until the user scrolls past the threshold. */
  overlay?: boolean;
}

/**
 * Marketing-grade nav for public studio + course pages.
 * Geist-style: minimal mark, mono-cased meta, fine bottom rule that fades in
 * once the user has scrolled past the hero.
 */
export function PublicNav({ studioName, studioSlug, overlay = false }: PublicNavProps) {
  const [scrolled, setScrolled] = useState(!overlay);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [overlay]);

  return (
    <nav
      className={cn(
        'relative z-40 w-full transition-[background-color,backdrop-filter,border-color] duration-300',
        scrolled
          ? 'bg-background/80 backdrop-blur-md border-b border-border/60'
          : 'bg-transparent border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="flex size-7 items-center justify-center rounded-md border border-border bg-background/60 group-hover:bg-background transition-colors">
            <Leaf className="size-3.5 text-foreground" strokeWidth={1.75} />
          </span>
          <span className="text-[15px] font-medium tracking-tight text-foreground">Ease</span>
        </Link>

        {studioName && studioSlug && (
          <Link
            to={`/${studioSlug}`}
            className="hidden sm:flex items-center gap-2 text-xs font-medium tracking-wide uppercase text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="hidden md:inline text-disabled-foreground">studio /</span>
            <span className="truncate max-w-[200px]">{studioName}</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
