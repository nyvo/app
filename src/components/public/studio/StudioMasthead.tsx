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
 * Identity-first masthead (mockup Q2A): when the seller has a cover image,
 * a full-bleed band carries it and the lockup sits under it, logo
 * overlapping the band's bottom edge; without one it falls back to the
 * plain lockup. Either way the identity line is quiet plain text —
 * «adresse · Veibeskrivelse» — no icons, no bold link.
 */
export function StudioMasthead({ organization, location }: StudioMastheadProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const hasCover = !!organization.cover_image_url && !coverFailed;

  return (
    <header>
      {hasCover && (
        <div className="h-28 sm:h-31 w-full overflow-hidden bg-muted">
          <img
            src={organization.cover_image_url!}
            alt=""
            className="size-full object-cover"
            onError={() => setCoverFailed(true)}
          />
        </div>
      )}

      <div
        className={cn(
          'mx-auto max-w-6xl px-4 sm:px-6 lg:px-8',
          hasCover ? 'relative -mt-8' : 'pt-10 sm:pt-14',
        )}
      >
        <div className={cn('flex gap-5', hasCover ? 'items-end' : 'items-center')}>
          <LogoTile organization={organization} size={hasCover ? 'cover' : 'plain'} />

          <div className={cn('min-w-0 flex-1', hasCover && 'pb-0.5')}>
            <h1
              className={cn(
                'font-medium text-foreground leading-tight tracking-[-0.012em]',
                hasCover ? 'text-[21px]' : 'text-2xl sm:text-[26px]',
              )}
            >
              {organization.name}
            </h1>

            {location && (
              <p
                className={cn(
                  'text-foreground-muted truncate',
                  hasCover ? 'mt-[3px] text-sm' : 'mt-[5px] text-[15px]',
                )}
              >
                {location.address || location.label}
                {' · '}
                <a
                  href={directionsUrl(location)}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-foreground-disabled underline-offset-[3px] transition-colors hover:text-foreground hover:decoration-foreground"
                >
                  Veibeskrivelse
                </a>
              </p>
            )}
          </div>
        </div>
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

function LogoTile({
  organization,
  size,
}: {
  organization: PublicSeller;
  size: 'cover' | 'plain';
}) {
  // A broken logo URL falls back to the same initials tile as no logo.
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = organization.logo_url;

  const frame = cn(
    'shrink-0 rounded-2xl overflow-hidden flex items-center justify-center',
    size === 'cover'
      ? 'size-16 relative border-[3px] border-background'
      : 'size-18',
  );

  if (logoUrl && !logoFailed) {
    return (
      <div className={cn(frame, 'bg-surface', size === 'plain' && 'ring-1 ring-border')}>
        <img
          src={logoUrl}
          alt={`${organization.name} logo`}
          className="size-full object-cover"
          onError={() => setLogoFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(frame, 'bg-muted text-foreground-muted', size === 'plain' && 'ring-1 ring-border')}
      aria-label={organization.name}
    >
      <span className={cn('font-medium tracking-[0.02em]', size === 'cover' ? 'text-[17px]' : 'text-xl')}>
        {initials(organization.name)}
      </span>
    </div>
  );
}
