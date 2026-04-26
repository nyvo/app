import { supabase, typedFrom } from '@/lib/supabase'
import type { Organization, OrganizationUpdate } from '@/types/database'

/**
 * Public org fields — a subset of Organization safe to expose on public
 * (anon-accessible) studio pages. Excludes Dintero internals, audit columns,
 * and anything not needed for public rendering.
 */
export interface PublicOrganization {
  id: string
  name: string
  slug: string
  city: string | null
  description: string | null
  logo_url: string | null
  email: string | null
  address: string | null
  postal_code: string | null
  default_course_image_url: string | null
  dintero_onboarding_complete: boolean
}

export async function fetchOrganizationBySlug(
  slug: string
): Promise<{ data: PublicOrganization | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, city, description, logo_url, email, address, postal_code, default_course_image_url, dintero_onboarding_complete')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as PublicOrganization | null, error: null }
}

export async function updateOrganization(
  id: string,
  updates: OrganizationUpdate
): Promise<{ data: Organization | null; error: Error | null }> {
  const { data, error } = await typedFrom('organizations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as Organization, error: null }
}
