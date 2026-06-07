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

  // Directions, not just "view" — once the map is shown, the useful action is
  // getting there. The /dir/ URL opens the native Maps app on mobile. Prefer an
  // exact pin (place_id, else coords); fall back to a text search.
  const params = new URLSearchParams({ api: '1' });
  if (placeId) {
    params.set('destination', location);
    params.set('destination_place_id', placeId);
  } else if (lat != null && lon != null) {
    params.set('destination', `${lat},${lon}`);
  } else {
    params.set('destination', location.split('·')[0].trim() || location);
  }
  const directionsUrl = `https://www.google.com/maps/dir/?${params.toString()}`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {hasCoords && (
        <MapEmbed
          placeId={placeId}
          lat={lat}
          lon={lon}
          title={`Kart over ${location}`}
          className="h-56 rounded-none border-0"
        />
      )}
      <div className={`flex items-start gap-4 p-6 ${hasCoords ? 'border-t border-border' : ''}`}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground-muted">
          <MapPin className="size-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-base font-medium text-foreground">{location}</p>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-foreground underline decoration-foreground-disabled underline-offset-2 hover:decoration-foreground"
          >
            Få veibeskrivelse
            <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
          </a>
        </div>
      </div>
    </div>
  );
}
