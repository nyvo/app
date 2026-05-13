import { MapPin } from '@/lib/icons';

interface LocationCardProps {
  /** The course's location string — usually "Studio · Sal" or a full address. */
  location: string;
}

/**
 * Sted — outlined card, no heading. MapPin icon self-identifies the card
 * as a location block. Maps link sits below.
 */
export function LocationCard({ location }: LocationCardProps) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex items-start gap-3.5">
        <MapPin className="size-4 shrink-0 mt-0.5 text-foreground" strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-foreground">{location}</p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center text-[13px] text-foreground underline decoration-foreground-disabled underline-offset-2 hover:decoration-foreground"
          >
            Få veibeskrivelse
          </a>
        </div>
      </div>
    </div>
  );
}
