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
 * Profile masthead (Time2book profile pattern, mockup Q2A): with a cover
 * image set, the page opens with a cover band and the logo overlapping the
 * band's bottom edge on its own line, name + identity lines stacked under.
 * Without a cover (or when it fails to load) the band is GONE, not a grey
 * placeholder — the header starts directly at the logo lockup on the plain
 * canvas (Luma profile / Airbnb host pattern: nobody reserves an empty image
 * box). The identity block is quiet plain text — place name on its own line,
 * street address + a standalone «Få veibeskrivelse» link under it — no icons.
 */
export function StudioMasthead({ organization, location }: StudioMastheadProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const coverUrl = organization.cover_image_url;
  const showCoverImage = !!coverUrl && !coverFailed;

  return (
    <header>
      {showCoverImage && (
        <div className="h-44 sm:h-60 w-full overflow-hidden bg-muted">
          <img
            src={coverUrl}
            alt=""
            className="media-outline size-full object-cover"
            onError={() => setCoverFailed(true)}
          />
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className={showCoverImage ? 'relative -mt-12' : 'pt-10 sm:pt-12'}>
          <LogoTile organization={organization} />
        </div>

        <h1 className="mt-4 text-3xl font-medium text-foreground">
          {organization.name}
        </h1>

        {location && <LocationIdentity location={location} organizationName={organization.name} />}
      </div>
    </header>
  );
}

/** Google uses the street portion as `displayName` for address results. Only
 * treat the label as a separate venue name when it differs from that portion. */
function hasDistinctPlaceName(location: StudioLocation): boolean {
  if (!location.label || !location.address) return false;
  const label = location.label.trim().toLocaleLowerCase('nb-NO');
  const addressLead = location.address.split(',')[0]?.trim().toLocaleLowerCase('nb-NO');
  return label !== addressLead;
}

function LocationIdentity({
  location,
  organizationName,
}: {
  location: StudioLocation;
  organizationName: string;
}) {
  // A venue label that just repeats the studio name (course locations are
  // often saved as "<studio name>, <street>") would render the name twice in
  // a row under the H1 — drop it and keep the address line alone.
  const repeatsStudioName =
    location.label.trim().toLocaleLowerCase('nb-NO')
    === organizationName.trim().toLocaleLowerCase('nb-NO');
  const showPlaceName = hasDistinctPlaceName(location) && !repeatsStudioName;
  const address = location.address || location.label;

  return (
    <div className="mt-1 text-sm text-foreground-muted">
      {showPlaceName && <p className="truncate">{location.label}</p>}
      <p className={cn('flex flex-wrap items-baseline gap-x-2', showPlaceName && 'mt-0.5')}>
        <span className="min-w-0 truncate">{address}</span>
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
    'size-24 shrink-0 rounded-full overflow-hidden flex items-center justify-center border-[3px] border-background';

  if (logoUrl && !logoFailed) {
    return (
      <div className={cn(frame, 'bg-surface')}>
        <img
          src={logoUrl}
          alt={`${organization.name}-logo`}
          className="media-outline size-full object-cover"
          onError={() => setLogoFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={cn(frame, 'bg-muted')} aria-label={organization.name}>
      <span className="text-2xl font-medium text-foreground-muted">
        {initials(organization.name)}
      </span>
    </div>
  );
}
