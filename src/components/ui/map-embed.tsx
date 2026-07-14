import { cn } from '@/lib/utils';

// Google Maps Embed API iframe. The Embed API is free and the key is
// referrer-restricted, so it's safe to expose client-side (unlike the Places
// key, which we proxy).
//
// The iframe lets Google set cookies, which the privacy page discloses under
// the cookie section — keep the two in sync if this ever changes.
//
// Renders nothing if the key is missing or there's no place_id / coordinates.

const EMBED_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY as string | undefined;

interface MapEmbedProps {
  placeId?: string | null;
  lat?: number | null;
  lon?: number | null;
  className?: string;
  title?: string;
}

export function MapEmbed({ placeId, lat, lon, className, title = 'Kart' }: MapEmbedProps) {
  if (!EMBED_KEY) return null;

  // Prefer the stable place_id; fall back to raw coordinates.
  let q: string | null = null;
  if (placeId) q = `place_id:${placeId}`;
  else if (lat != null && lon != null) q = `${lat},${lon}`;
  if (!q) return null;

  const src = `https://www.google.com/maps/embed/v1/place?key=${EMBED_KEY}&q=${encodeURIComponent(q)}&language=no&region=NO`;

  return (
    <iframe
      title={title}
      src={src}
      className={cn('h-48 w-full rounded-xl border border-border', className)}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );
}
