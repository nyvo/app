import { Link } from 'react-router-dom';
import { Leaf } from '@/lib/icons';

interface PublicFooterProps {
  studioName?: string;
  studioCity?: string | null;
}

/**
 * Quiet editorial footer used on studio + course pages. Mostly typography,
 * one fine top rule, no visual noise.
 */
export function PublicFooter({ studioName, studioCity }: PublicFooterProps) {
  return (
    <footer className="mt-24 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <span className="flex size-7 items-center justify-center rounded-md border border-border">
                <Leaf className="size-3.5 text-foreground" strokeWidth={1.75} />
              </span>
              <span className="text-[15px] font-medium tracking-tight text-foreground">Ease</span>
            </Link>
            <p className="max-w-sm text-sm text-foreground-muted leading-relaxed">
              Påmeldingsplattform for kurs, timer og arrangementer. Drevet av små studioer i Norge.
            </p>
          </div>

          <div className="flex flex-col gap-3 text-xs font-medium tracking-wide uppercase text-foreground-muted sm:flex-row sm:gap-8">
            {studioName && (
              <span className="text-foreground/80">
                {studioName}
                {studioCity ? <span className="text-foreground-muted"> · {studioCity}</span> : null}
              </span>
            )}
            <Link to="/terms" className="hover:text-foreground transition-colors">Vilkår</Link>
            <Link to="/" className="hover:text-foreground transition-colors">Forsiden</Link>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/40 flex items-center justify-between text-[11px] tracking-wide uppercase text-foreground-disabled">
          <span>© {new Date().getFullYear()} Ease</span>
          <span className="font-medium">Laget i Norge</span>
        </div>
      </div>
    </footer>
  );
}
