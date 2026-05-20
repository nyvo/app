import { ArrowUpRight, MapPin } from '@/lib/icons';

interface LocationCardProps {
  /** The course's location string — usually "Studio · Sal" or a full address. */
  location: string;
}

export function LocationCard({ location }: LocationCardProps) {
  const geocodeQuery = location.split('·')[0].trim() || location;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(geocodeQuery)}`;

  return (
    <div className="flex items-start gap-4 rounded-xl border border-border bg-surface p-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground-muted">
        <MapPin className="size-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-base font-medium text-foreground">{location}</p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-foreground underline decoration-foreground-disabled underline-offset-2 hover:decoration-foreground"
        >
          Se lokasjon
          <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
        </a>
      </div>
    </div>
  );
}
