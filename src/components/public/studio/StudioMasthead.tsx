import { ArrowUpRight, Building, MapPin } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { PublicSeller } from '@/services/sellers';
import { directionsUrl, type StudioLocation } from './studioFacts';

interface StudioMastheadProps {
  organization: PublicSeller;
  /** The studio's single display location (canonical from the Studio tab, or
   * a course-derived fallback). Null hides the location line. */
  location?: StudioLocation | null;
}

/**
 * Identity-first masthead — no cover banner, no tabs. A studio storefront is
 * a place you book, so the header is just the brand lockup (squircle logo +
 * name) with one line: where the studio is, with a directions link.
 */
export function StudioMasthead({ organization, location }: StudioMastheadProps) {
  const hasLogoOverride = organization.slug === 'inspire-yogastudio';
  const logoUrl = hasLogoOverride
    ? '/68bc6f41587d4e422ca9562d_Logo - black.svg'
    : organization.logo_url;

  return (
    <header className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14">
      <div className="flex items-start gap-5 sm:gap-6">
        {logoUrl ? (
          <div className="size-20 sm:size-24 shrink-0 overflow-hidden rounded-2xl ring-1 ring-border bg-surface flex items-center justify-center">
            <img
              src={logoUrl}
              alt={`${organization.name} logo`}
              className={cn('size-full', hasLogoOverride ? 'object-contain p-3' : 'object-cover')}
            />
          </div>
        ) : (
          <div
            className="size-20 sm:size-24 shrink-0 rounded-2xl ring-1 ring-border bg-muted text-foreground-muted flex items-center justify-center"
            aria-label={organization.name}
          >
            <Building className="size-9 sm:size-10" strokeWidth={1.5} />
          </div>
        )}

        <div className="min-w-0 flex-1 pt-0.5">
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-foreground leading-tight">
            {organization.name}
          </h1>

          {location && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-foreground-muted">
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <MapPin className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{location.address || location.label}</span>
              </span>
              <a
                href={directionsUrl(location)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary transition-colors"
              >
                Få veibeskrivelse
                <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
