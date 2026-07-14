import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Google Maps Embed API iframe behind a click-to-load consent facade.
//
// The Embed API is free and the key is referrer-restricted, so it's safe to
// expose client-side (unlike the Places key, which we proxy). But the iframe
// lets Google set cookies, and the privacy page promises we set nothing
// non-essential — so the map loads only after an explicit click. One click
// shows maps for the rest of the browser session (per tab).
//
// Renders nothing if the key is missing or there's no place_id / coordinates.

const EMBED_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY as string | undefined;

const CONSENT_KEY = 'maps-embed-ok';

function hasSessionConsent(): boolean {
  try {
    return sessionStorage.getItem(CONSENT_KEY) === '1';
  } catch {
    return false; // storage blocked (private mode) — just ask again
  }
}

interface MapEmbedProps {
  placeId?: string | null;
  lat?: number | null;
  lon?: number | null;
  className?: string;
  title?: string;
  /** Skip the click-to-load consent facade and load the iframe immediately.
   *  ONLY for authenticated dashboard surfaces (the teacher viewing their own
   *  course) — public pages keep the facade per the privacy-page promise. */
  autoload?: boolean;
}

export function MapEmbed({ placeId, lat, lon, className, title = 'Kart', autoload = false }: MapEmbedProps) {
  const [showMap, setShowMap] = useState(() => autoload || hasSessionConsent());

  if (!EMBED_KEY) return null;

  // Prefer the stable place_id; fall back to raw coordinates.
  let q: string | null = null;
  if (placeId) q = `place_id:${placeId}`;
  else if (lat != null && lon != null) q = `${lat},${lon}`;
  if (!q) return null;

  if (!showMap) {
    return (
      <div
        className={cn(
          'flex h-48 w-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted',
          className,
        )}
      >
        <Button
          variant="outline"
          onClick={() => {
            try {
              sessionStorage.setItem(CONSENT_KEY, '1');
            } catch {
              // storage blocked — the map still loads for this instance
            }
            setShowMap(true);
          }}
        >
          Vis kart
        </Button>
        <p className="text-sm text-foreground">Kartet lastes fra Google Maps.</p>
      </div>
    );
  }

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
