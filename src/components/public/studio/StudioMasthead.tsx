import { useState } from 'react';
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
 * Profile masthead (Time2book profile pattern, mockup Q2A): the page opens
 * with a cover header band — the seller's cover image when set, a quiet
 * muted fill when not — with the logo overlapping the band's bottom edge on
 * its own line, and the name + identity lines stacked under it. The identity
 * block is quiet plain text — place name on its own line, street address +
 * a standalone «Få veibeskrivelse» link under it — no icons.
 */
export function StudioMasthead({ organization, location }: StudioMastheadProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const coverUrl = organization.cover_image_url;
  const showCoverImage = !!coverUrl && !coverFailed;

  return (
    <header>
      <div className="h-32 sm:h-44 w-full overflow-hidden bg-muted">
        {showCoverImage && (
          <img
            src={coverUrl}
            alt=""
            className="size-full object-cover"
            onError={() => setCoverFailed(true)}
          />
        )}
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-9">
          <LogoTile organization={organization} />
        </div>

        <h1 className="mt-4 text-2xl font-medium text-foreground">
          {organization.name}
        </h1>

        {location && (
          // Two quiet lines: the place name, then the street address (when
          // set) with a standalone «Få veibeskrivelse» link — gap-separated,
          // no joining punctuation.
          <div className="mt-1 text-sm text-foreground-muted">
            <p className="truncate">{location.label || location.address}</p>
            <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
              {location.label && location.address && (
                <span className="min-w-0 truncate">{location.address}</span>
              )}
              <a
                href={directionsUrl(location)}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-primary underline underline-offset-2 hover:decoration-2"
              >
                Få veibeskrivelse
              </a>
            </p>
          </div>
        )}
      </div>
    </header>
  );
}

/** «FY»-style initials: first letter of the first two words. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

function LogoTile({ organization }: { organization: PublicSeller }) {
  // A broken logo URL falls back to the same initials tile as no logo.
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = organization.logo_url;

  const frame =
    'size-18 shrink-0 rounded-full overflow-hidden flex items-center justify-center border-[3px] border-background';

  if (logoUrl && !logoFailed) {
    return (
      <div className={cn(frame, 'bg-surface')}>
        <img
          src={logoUrl}
          alt={`${organization.name}-logo`}
          className="size-full object-cover"
          onError={() => setLogoFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={cn(frame, 'bg-muted')} aria-label={organization.name}>
      <span className="text-xl font-medium text-foreground-muted">
        {initials(organization.name)}
      </span>
    </div>
  );
}
