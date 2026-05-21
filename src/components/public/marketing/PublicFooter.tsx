import { Link } from 'react-router-dom';

interface PublicFooterProps {
  studioName?: string;
  /** Outer max-width. Defaults to `max-w-6xl` for course detail; pass `max-w-5xl` for the studio profile. */
  maxWidthClassName?: string;
}

/**
 * Quiet editorial footer used on studio + course pages. Mostly typography,
 * one fine top rule, no visual noise.
 */
export function PublicFooter({ studioName, maxWidthClassName = 'max-w-6xl' }: PublicFooterProps) {
  return (
    <footer className="mt-24 border-t border-border">
      <div className={`mx-auto ${maxWidthClassName} px-4 sm:px-6 lg:px-8 py-12`}>
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Link to="/" className="inline-flex items-center group">
              <span className="text-base font-medium tracking-tight text-foreground">Openspot</span>
            </Link>
            <p className="max-w-sm text-base text-foreground-muted leading-relaxed">
              Påmeldingsplattform for kurs, timer og arrangementer. Drevet av små studioer i Norge.
            </p>
          </div>

          <div className="flex flex-col gap-3 text-base font-medium text-foreground-muted sm:flex-row sm:gap-8">
            {studioName && <span className="text-foreground">{studioName}</span>}
            <Link to="/terms" className="hover:text-foreground transition-colors">Vilkår</Link>
            <Link to="/personvern" className="hover:text-foreground transition-colors">Personvern</Link>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex items-center justify-between text-base text-foreground-disabled">
          <span>© {new Date().getFullYear()} Openspot</span>
          <span className="font-medium">Laget i Norge</span>
        </div>
      </div>
    </footer>
  );
}
