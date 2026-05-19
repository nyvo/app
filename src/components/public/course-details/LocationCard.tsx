import { ArrowUpRight } from '@/lib/icons';

interface LocationCardProps {
  /** The course's location string — usually "Studio · Sal" or a full address. */
  location: string;
}

/**
 * Sted — map preview + address + directions/copy actions. The embed uses
 * Google Maps' keyless search URL, so any location string works (full
 * address, studio name, etc.) without needing an API key.
 */
export function LocationCard({ location }: LocationCardProps) {
  // The stored string combines venue + room (e.g. "InSPIRE Yogastudio · Sal 1").
  // The room part isn't geocodable and confuses Google's search, so we strip
  // it before building the map URLs. Display + copy still use the full label.
  const geocodeQuery = location.split('·')[0].trim() || location;
  const encoded = encodeURIComponent(geocodeQuery);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  const embedUrl = `https://maps.google.com/maps?q=${encoded}&z=15&output=embed`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="aspect-[16/9] w-full bg-muted">
        <iframe
          title="Kart over kurslokasjonen"
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="size-full border-0"
        />
      </div>
      <div className="p-6">
        <p className="text-base font-medium text-foreground">{location}</p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-foreground underline decoration-foreground-disabled underline-offset-2 hover:decoration-foreground"
        >
          Veibeskrivelse
          <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
        </a>
      </div>
    </div>
  );
}
