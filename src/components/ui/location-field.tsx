import { MapPin } from '@/lib/icons'
import { PlacesAutocomplete } from '@/components/ui/places-autocomplete'
import { MapEmbed } from '@/components/ui/map-embed'
import type { PlaceDetails } from '@/services/places'

export interface LocationCoords {
  lat: number | null
  lon: number | null
  placeId: string | null
}

interface LocationFieldProps {
  /** Place name shown in the field. */
  value: string
  /** Coords behind the current place — drives the map; null when typed/cleared. */
  coords: LocationCoords | null
  /** Optional address line shown under the field. */
  address?: string | null
  /** Fires on every change: free-typed (coords null) or a picked place (coords set). */
  onChange: (next: { name: string; address: string; coords: LocationCoords | null }) => void
  disabled?: boolean
  id?: string
  placeholder?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/**
 * Shared location picker — Google Places search (with leading pin) + an
 * embedded map once a place is selected. Used by the course builder and the
 * course-detail edit form so both surfaces behave identically.
 */
export function LocationField({
  value,
  coords,
  address,
  onChange,
  disabled,
  id,
  placeholder = 'Søk etter studio eller adresse',
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: LocationFieldProps) {
  const showMap = coords?.placeId != null || (coords?.lat != null && coords?.lon != null)
  return (
    <div className="space-y-3">
      <PlacesAutocomplete
        id={id}
        icon={MapPin}
        value={value}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        onChange={(v) => onChange({ name: v, address: '', coords: null })}
        onSelect={(p: PlaceDetails) =>
          onChange({
            name: p.name || p.address,
            address: p.address,
            coords: { lat: p.lat, lon: p.lon, placeId: p.placeId },
          })
        }
        placeholder={placeholder}
      />
      {address && <p className="text-sm text-foreground-muted">{address}</p>}
      {showMap && (
        <MapEmbed
          placeId={coords?.placeId}
          lat={coords?.lat}
          lon={coords?.lon}
          title={value ? `Kart over ${value}` : 'Kart'}
          className="h-44"
        />
      )}
    </div>
  )
}
