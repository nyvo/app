import { supabase, typedFrom } from '@/lib/supabase'
import type { Seller, SellerUpdate } from '@/types/database'

/**
 * Public seller fields — a subset of Seller safe to expose on public
 * (anon-accessible) studio pages, merged with the team's display fields
 * (slug, description, default_course_image_url). Excludes Dintero internals
 * and audit columns.
 *
 * Note: `slug`, `description`, and `default_course_image_url` actually live on
 * `teams`, not `sellers`. We merge them here to keep the public-rendering
 * surface single-shaped.
 */
export interface PublicSeller {
  id: string
  name: string
  slug: string
  city: string | null
  logo_url: string | null
  email: string | null
  address: string | null
  postal_code: string | null
  description: string | null
  default_course_image_url: string | null
  dintero_onboarding_complete: boolean
}

export async function fetchSellerBySlug(
  slug: string
): Promise<{ data: PublicSeller | null; error: Error | null }> {
  // Slug now lives on the team (one team per seller). Resolve seller via
  // the team's owner_seller_id.
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('owner_seller_id, slug, description, default_course_image_url')
    .eq('slug', slug)
    .maybeSingle()

  if (teamError) {
    return { data: null, error: teamError as Error }
  }
  if (!team) return { data: null, error: null }

  const teamRow = team as {
    owner_seller_id: string
    slug: string
    description: string | null
    default_course_image_url: string | null
  }

  const { data, error } = await supabase
    .from('sellers')
    .select('id, name, city, logo_url, email, address, postal_code, dintero_onboarding_complete')
    .eq('id', teamRow.owner_seller_id)
    .maybeSingle()

  if (error) {
    return { data: null, error: error as Error }
  }
  if (!data) return { data: null, error: null }

  const seller = data as Omit<PublicSeller, 'slug' | 'description' | 'default_course_image_url'>
  const merged: PublicSeller = {
    ...seller,
    slug: teamRow.slug,
    description: teamRow.description,
    default_course_image_url: teamRow.default_course_image_url,
  }

  return { data: merged, error: null }
}

export async function updateSeller(
  id: string,
  updates: SellerUpdate
): Promise<{ data: Seller | null; error: Error | null }> {
  const { data, error } = await typedFrom('sellers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: error as Error }
  }

  return { data: data as Seller, error: null }
}
