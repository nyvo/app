import { MapPin, ArrowRight } from '@/lib/icons';

interface LocationCardProps {
  /** The course's location string — usually "Studio · Sal" */
  location: string;
  /** Studio's full street address — secondary line under location */
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
}

function buildAddressLine(address?: string | null, postalCode?: string | null, city?: string | null): string | null {
  const parts = [address, [postalCode, city].filter(Boolean).join(' ')]
    .filter((p): p is string => !!p && p.trim().length > 0);
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Sted — outlined card, no heading. MapPin icon self-identifies the card
 * as a location block. Optional Maps link sits at the bottom.
 */
export function LocationCard({ location, address, postalCode, city }: LocationCardProps) {
  const fullAddress = buildAddressLine(address, postalCode, city);
  const mapsQuery = fullAddress ? `${location} ${fullAddress}` : location;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  return (
    <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-3.5">
        <MapPin className="size-4 shrink-0 mt-0.5 text-foreground" strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-foreground">{location}</p>
          {fullAddress && (
            <p className="mt-0.5 text-[13px] text-foreground-muted">{fullAddress}</p>
          )}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[13px] text-foreground underline decoration-disabled-foreground underline-offset-2 hover:decoration-foreground"
          >
            Få veibeskrivelse
            <ArrowRight className="size-3" strokeWidth={2} />
          </a>
        </div>
      </div>
    </div>
  );
}
