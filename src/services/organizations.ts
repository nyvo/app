import { supabase } from '@/lib/supabase'
import type { Organization, OrganizationUpdate } from '@/types/database'

// Fetch organization by slug for public pages
export async function fetchOrganizationBySlug(
  slug: string
): Promise<{ data: Organization | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data, error: null }
}

// Fetch organization by ID
export async function fetchOrganizationById(
  id: string
): Promise<{ data: Organization | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data, error: null }
}

// Update organization
export async function updateOrganization(
  id: string,
  updates: OrganizationUpdate
): Promise<{ data: Organization | null; error: Error | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('organizations') as any)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as Organization, error: null }
}
