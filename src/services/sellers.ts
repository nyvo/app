import { supabase, typedFrom } from '@/lib/supabase'
import type { Seller, SellerUpdate } from '@/types/database'

/**
 * Public seller fields — a subset of Seller safe to expose on public
 * (anon-accessible) studio pages, merged with the team's display fields
 * (slug, default_course_image_url). Excludes Dintero internals and audit
 * columns. Email is intentionally excluded from direct public seller reads.
 *
 * Note: `slug` and `default_course_image_url` actually live on `teams`, not
 * `sellers`. We merge them here to keep the public-rendering surface
 * single-shaped.
 */
export interface PublicSeller {
  id: string
  name: string
  slug: string
  logo_url: string | null
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
    .select('owner_seller_id, slug, default_course_image_url')
    .eq('slug', slug)
    .maybeSingle()

  if (teamError) {
    return { data: null, error: teamError as Error }
  }
  if (!team) return { data: null, error: null }

  const teamRow = team as {
    owner_seller_id: string
    slug: string
    default_course_image_url: string | null
  }

  const { data, error } = await supabase
    .from('sellers')
    .select('id, name, logo_url, dintero_onboarding_complete')
    .eq('id', teamRow.owner_seller_id)
    .maybeSingle()

  if (error) {
    return { data: null, error: error as Error }
  }
  if (!data) return { data: null, error: null }

  const seller = data as Omit<PublicSeller, 'slug' | 'default_course_image_url'>
  const merged: PublicSeller = {
    ...seller,
    slug: teamRow.slug,
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
    .select('id, name, logo_url, dintero_onboarding_complete, created_at')
    .single()

  if (error) {
    return { data: null, error: error as Error }
  }

  const row = data as Pick<
    Seller,
    'id' | 'name' | 'logo_url' | 'dintero_onboarding_complete' | 'created_at'
  >

  const { data: operational } = await fetchSellerOperational(id)

  return {
    data: {
      ...row,
      email: null,
      phone: null,
      dintero_seller_id: operational?.dintero_seller_id ?? null,
      dintero_approval_id: null,
      dintero_contract_url: null,
      dintero_onboarding_status: operational?.dintero_onboarding_status ?? null,
      settings: {},
      seller_type: operational?.seller_type ?? updates.seller_type ?? 'individual',
      organization_number: null,
      updated_at: operational?.updated_at ?? row.created_at,
    },
    error: null,
  }
}

/**
 * Operational seller fields that are not part of the public storefront
 * grant set. Fetched via a member-gated RPC; returns null for non-members.
 */
export interface SellerOperational {
  dintero_seller_id: string | null
  dintero_onboarding_status: string | null
  seller_type: string
  updated_at: string | null
}

export async function fetchSellerOperational(
  sellerId: string
): Promise<{ data: SellerOperational | null; error: Error | null }> {
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string, args: Record<string, string>
  ) => ReturnType<typeof supabase.rpc>)('get_seller_operational', {
    p_seller_id: sellerId,
  })

  if (error) {
    return { data: null, error: error as Error }
  }

  const rows = data as unknown as SellerOperational[] | null
  if (!rows || rows.length === 0) {
    return { data: null, error: null }
  }
  return { data: rows[0], error: null }
}
