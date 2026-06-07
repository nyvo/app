import { ArrowUpRight, MapPin } from '@/lib/icons';
import { MapEmbed } from '@/components/ui/map-embed';
import { LOCATION_VALUE_SEPARATOR } from '@/lib/rooms';

interface LocationCardProps {
  /** The course's location string — usually "Venue – Room" or a freeform place. */
  location: string;
  /** Street address copied from the picked venue; shown under the title. */
  address?: string | null;
  /** When the location was picked from a Google Place, these pin it exactly. */
  lat?: number | null;
  lon?: number | null;
  placeId?: string | null;
}

export function LocationCard({ location, address, lat, lon, placeId }: LocationCardProps) {
  const hasCoords = placeId != null || (lat != null && lon != null);

  // "Venue – Room" → venue becomes the title; the room drops to the detail line
  // beside the address. A freeform location with no separator stays as the title.
  const [venue, ...roomParts] = location.split(LOCATION_VALUE_SEPARATOR);
  const room = roomParts.join(LOCATION_VALUE_SEPARATOR) || null;
  const title = venue || location;
  const detail = [address, room].filter(Boolean).join(' · ');

  // Directions, not just "view" — once the map is shown, the useful action is
  // getting there. The /dir/ URL opens the native Maps app on mobile. Prefer an
  // exact pin (place_id, else coords); fall back to a text search.
  const params = new URLSearchParams({ api: '1' });
  if (placeId) {
    params.set('destination', address || title);
    params.set('destination_place_id', placeId);
  } else if (lat != null && lon != null) {
    params.set('destination', `${lat},${lon}`);
  } else {
    params.set('destination', address || title);
  }
  const directionsUrl = `https://www.google.com/maps/dir/?${params.toString()}`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {hasCoords && (
        <MapEmbed
          placeId={placeId}
          lat={lat}
          lon={lon}
          title={`Kart over ${title}`}
          className="h-56 rounded-none border-0"
        />
      )}
      <div className={`flex items-start gap-4 p-6 ${hasCoords ? 'border-t border-border' : ''}`}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground-muted">
          <MapPin className="size-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-base font-medium text-foreground">{title}</p>
          {detail && <p className="mt-0.5 text-sm text-foreground-muted">{detail}</p>}
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
