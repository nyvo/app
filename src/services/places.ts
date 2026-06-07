import { supabase } from '@/lib/supabase'
import { extractEdgeError } from '@/lib/edge-errors'

// Thin client over the `google-places` edge function. The Google API key stays
// server-side; the client only ever sees trimmed suggestions and details.

export interface PlaceSuggestion {
  placeId: string
  primary: string
  secondary: string
}

export interface PlaceDetails {
  placeId: string
  name: string
  address: string
  lat: number | null
  lon: number | null
}

export async function searchPlaces(
  input: string,
  sessionToken: string,
): Promise<{ data: PlaceSuggestion[]; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('google-places', {
      body: { action: 'autocomplete', input, sessionToken },
    })
    if (error) {
      const { message } = await extractEdgeError(error)
      return { data: [], error: new Error(message || 'Søket feilet') }
    }
    return { data: (data?.suggestions ?? []) as PlaceSuggestion[], error: null }
  } catch (err) {
    return { data: [], error: err instanceof Error ? err : new Error('Søket feilet') }
  }
}

export async function getPlaceDetails(
  placeId: string,
  sessionToken: string,
): Promise<{ data: PlaceDetails | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('google-places', {
      body: { action: 'details', placeId, sessionToken },
    })
    if (error) {
      const { message } = await extractEdgeError(error)
      return { data: null, error: new Error(message || 'Kunne ikke hente stedet') }
    }
    return { data: data as PlaceDetails, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Kunne ikke hente stedet') }
  }
}
