import { MapPin, Mail, ArrowRight } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { getInitials } from '@/utils/stringUtils';
import type { PublicSeller } from '@/services/sellers';

interface StudioHeroProps {
  organization: PublicSeller;
}

function buildAddress(org: PublicSeller): string | null {
  const parts = [org.address, [org.postal_code, org.city].filter(Boolean).join(' ')]
    .filter((p): p is string => !!p && p.trim().length > 0);
  return parts.length > 0 ? parts.join(', ') : null;
}

function buildMapsUrl(org: PublicSeller): string | null {
  const address = buildAddress(org);
  if (!address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${org.name} ${address}`)}`;
}

/**
 * Studio hero with sidecar info card.
 * Logo chip on a neutral surface so colored logos can't clash with the
 * cards below. Falls back to initials when no logo is uploaded.
 */
export function StudioHero({ organization }: StudioHeroProps) {
  const address = buildAddress(organization);
  const mapsUrl = buildMapsUrl(organization);
  const initials = getInitials(organization.name);

  return (
    <section className="pt-14 pb-12 sm:pt-20 sm:pb-16">
      <div className="grid gap-8 lg:gap-14 lg:grid-cols-[1fr_340px] items-start">
        <div>
          <h1 className="font-semibold tracking-tight text-foreground text-[clamp(2.25rem,5vw,4rem)] leading-[1.04]">
            {organization.name}
          </h1>
          {organization.description && (
            <p className="mt-5 max-w-2xl text-base text-foreground-muted leading-relaxed whitespace-pre-line">
              {organization.description}
            </p>
          )}
        </div>

        <aside className="flex flex-col gap-3.5 rounded-lg bg-muted p-5">
          {/* Logo chip — colored logo lives inside a neutral container,
              or initials fallback on dark surface */}
          {organization.logo_url ? (
            <div className="flex size-12 items-center justify-center rounded-md bg-background ring-1 ring-border p-2">
              <img
                src={organization.logo_url}
                alt={`${organization.name} logo`}
                className="size-full object-contain"
              />
            </div>
          ) : (
            <div
              className={cn(
                'flex size-12 items-center justify-center rounded-md',
                'bg-foreground text-background text-base font-semibold tracking-tight',
              )}
              aria-label={organization.name}
            >
              {initials}
            </div>
          )}

          {address && (
            <div className="flex items-start gap-2.5 text-[13px] text-foreground leading-[1.45]">
              <MapPin className="size-3.5 mt-0.5 shrink-0 text-foreground-muted" strokeWidth={1.75} />
              <span>{address}</span>
            </div>
          )}

          {organization.email && (
            <div className="flex items-start gap-2.5 text-[13px] text-foreground leading-[1.45]">
              <Mail className="size-3.5 mt-0.5 shrink-0 text-foreground-muted" strokeWidth={1.75} />
              <a
                href={`mailto:${organization.email}`}
                className="underline decoration-disabled-foreground underline-offset-2 hover:decoration-foreground break-all"
              >
                {organization.email}
              </a>
            </div>
          )}

          {mapsUrl && (
            <>
              <div className="h-px bg-border" />
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground underline decoration-disabled-foreground underline-offset-[3px] hover:decoration-foreground"
              >
                Få veibeskrivelse
                <ArrowRight className="size-3" strokeWidth={2} />
              </a>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
