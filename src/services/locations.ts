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
    .order('name', { ascending: true })

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
