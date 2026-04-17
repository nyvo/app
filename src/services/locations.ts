import { typedFrom } from '@/lib/supabase'
import type {
  TeacherLocation,
  TeacherLocationInsert,
  TeacherLocationUpdate,
} from '@/types/database'

export async function fetchLocations(
  organizationId: string
): Promise<{ data: TeacherLocation[]; error: Error | null }> {
  const { data, error } = await typedFrom('teacher_locations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('is_favorite', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) return { data: [], error: error as Error }
  return { data: (data ?? []) as TeacherLocation[], error: null }
}

export async function createLocation(
  location: TeacherLocationInsert
): Promise<{ data: TeacherLocation | null; error: Error | null }> {
  const { data, error } = await typedFrom('teacher_locations')
    .insert(location)
    .select()
    .single()

  if (error) return { data: null, error: error as Error }
  return { data: data as TeacherLocation, error: null }
}

export async function updateLocation(
  id: string,
  updates: TeacherLocationUpdate
): Promise<{ data: TeacherLocation | null; error: Error | null }> {
  const { data, error } = await typedFrom('teacher_locations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: error as Error }
  return { data: data as TeacherLocation, error: null }
}

export async function deleteLocation(
  id: string
): Promise<{ error: Error | null }> {
  const { error } = await typedFrom('teacher_locations')
    .delete()
    .eq('id', id)

  if (error) return { error: error as Error }
  return { error: null }
}

/**
 * Set a location as the favorite for an organization.
 * Clears any existing favorite first, then sets the new one.
 * Pass null to clear the favorite without setting a new one.
 */
export async function setFavoriteLocation(
  organizationId: string,
  locationId: string | null
): Promise<{ error: Error | null }> {
  // Clear existing favorite
  const { error: clearError } = await typedFrom('teacher_locations')
    .update({ is_favorite: false })
    .eq('organization_id', organizationId)
    .eq('is_favorite', true)

  if (clearError) return { error: clearError as Error }

  // Set the new favorite
  if (locationId) {
    const { error: setError } = await typedFrom('teacher_locations')
      .update({ is_favorite: true })
      .eq('id', locationId)

    if (setError) return { error: setError as Error }
  }

  return { error: null }
}
