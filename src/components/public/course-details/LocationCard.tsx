import { ArrowUpRight, MapPin } from '@/lib/icons';
import { MapEmbed } from '@/components/ui/map-embed';

interface LocationCardProps {
  /** The course's location string — usually "Studio · Sal" or a full address. */
  location: string;
  /** When the location was picked from a Google Place, these pin it exactly. */
  lat?: number | null;
  lon?: number | null;
  placeId?: string | null;
}

export function LocationCard({ location, lat, lon, placeId }: LocationCardProps) {
  const hasCoords = placeId != null || (lat != null && lon != null);

  // Prefer an exact pin (place_id, else coords); fall back to a text search.
  const mapsUrl = placeId
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}&query_place_id=${encodeURIComponent(placeId)}`
    : lat != null && lon != null
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.split('·')[0].trim() || location)}`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-start gap-4 p-6">
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
      {hasCoords && (
        <MapEmbed
          placeId={placeId}
          lat={lat}
          lon={lon}
          title={`Kart over ${location}`}
          className="h-56 rounded-none border-0 border-t border-border"
        />
      )}
    </div>
  );
}
