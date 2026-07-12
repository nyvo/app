import { supabase } from '@/lib/supabase'
import type { Seller, SellerUpdate } from '@/types/database'

/**
 * Public seller fields — a subset of Seller safe to expose on public
 * (anon-accessible) studio pages. slug, cover_image_url and
 * default_course_image_url now live directly on the seller row. Email is
 * intentionally excluded from direct public seller reads.
 */
export interface PublicSeller {
  id: string
  name: string
  slug: string
  logo_url: string | null
  cover_image_url: string | null
  default_course_image_url: string | null
  stripe_onboarding_complete: boolean
}

export async function fetchSellerBySlug(
  slug: string
): Promise<{ data: PublicSeller | null; error: Error | null }> {
  const lookupSlug = slug.trim().toLowerCase()

  const publicColumns = 'id, name, logo_url, slug, cover_image_url, default_course_image_url, stripe_onboarding_complete'

  // Slug lives directly on the seller. On miss, fall back to
  // seller_slug_aliases so previously shared URLs keep resolving — callers
  // compare `slug` to the returned `PublicSeller.slug` and 301-style replace
  // if they differ.
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select(publicColumns)
    .eq('slug', lookupSlug)
    .maybeSingle()

  if (sellerError) {
    return { data: null, error: sellerError as Error }
  }

  if (seller) {
    return { data: seller as unknown as PublicSeller, error: null }
  }

  const { data: alias, error: aliasError } = await supabase
    .from('seller_slug_aliases')
    .select('seller_id')
    .eq('old_slug', lookupSlug)
    .maybeSingle()

  if (aliasError) {
    return { data: null, error: aliasError as Error }
  }
  if (!alias) return { data: null, error: null }

  const aliasRow = alias as { seller_id: string }
  const { data: aliasedSeller, error: aliasedError } = await supabase
    .from('sellers')
    .select(publicColumns)
    .eq('id', aliasRow.seller_id)
    .maybeSingle()

  if (aliasedError) {
    return { data: null, error: aliasedError as Error }
  }
  if (!aliasedSeller) return { data: null, error: null }

  return { data: aliasedSeller as unknown as PublicSeller, error: null }
}

// The old `fetchStudioLocation` (RPC `public_studio_location` over
// `teacher_locations`) was removed 2026-07-11 with the Studio "Sted" tab —
// the table never got data, so the storefront's display location is derived
// from course locations alone (deriveStudioFacts). The RPC/table still exist
// in the DB; re-add a read here if the saved-locations feature returns.

/**
 * Browser-side seller update. Deliberately narrowed to the columns the
 * authenticated role holds an UPDATE grant on — everything else on sellers
 * is server-controlled (service-role edge functions / DEFINER RPCs).
 */
export async function updateSeller(
  id: string,
  updates: Pick<SellerUpdate, 'name' | 'logo_url' | 'cover_image_url'>
): Promise<{ data: Seller | null; error: Error | null }> {
  const { data, error } = await supabase.from('sellers')
    .update(updates)
    .eq('id', id)
    .select('id, name, logo_url, slug, cover_image_url, default_course_image_url, stripe_onboarding_complete, created_at')
    .single()

  if (error) {
    return { data: null, error: error as Error }
  }

  const row = data as Pick<
    Seller,
    'id' | 'name' | 'logo_url' | 'slug' | 'cover_image_url' | 'default_course_image_url' | 'stripe_onboarding_complete' | 'created_at'
  >

  const { data: operational } = await fetchSellerOperational(id)

  return {
    data: {
      ...row,
      closed_at: null,
      email: null,
      stripe_account_id: operational?.stripe_account_id ?? null,
      stripe_account_status: operational?.stripe_account_status ?? null,
      stripe_onboarding_complete: operational?.stripe_onboarding_complete ?? false,
      stripe_payouts_enabled: operational?.stripe_payouts_enabled ?? false,
      operating_model: operational?.operating_model ?? 'solo',
      organization_number: null,
      subscription_plan: operational?.subscription_plan ?? 'free',
      subscription_status: operational?.subscription_status ?? 'none',
      subscription_current_period_end: operational?.subscription_current_period_end ?? null,
      subscription_cancel_at_period_end: operational?.subscription_cancel_at_period_end ?? false,
      subscription_provider: null,
      subscription_customer_id: operational?.subscription_customer_id ?? null,
      subscription_external_id: null,
      uses_integrated_payments: operational?.uses_integrated_payments ?? false,
      updated_at: operational?.updated_at ?? row.created_at,
    },
    error: null,
  }
}

/**
 * Rename a seller's public slug. The previous slug is archived in
 * seller_slug_aliases so links shared in the wild keep resolving via a
 * client-side redirect on the public storefront.
 *
 * RPC enforces owner-only writes, the same normalization + reserved-list as
 * onboarding, and uniqueness against both current slugs and archived aliases.
 * Returns the canonical normalized slug on success.
 */
export async function renameSellerSlug(
  sellerId: string,
  newSlug: string,
): Promise<{ slug: string | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('rename_seller_slug', {
    p_seller_id: sellerId,
    p_new_slug: newSlug,
  })

  if (error) {
    return { slug: null, error: error as Error }
  }
  return { slug: data as string, error: null }
}

/**
 * Operational seller fields that are not part of the public storefront
 * grant set. Fetched via a member-gated RPC; returns null for non-members.
 */
export type SubscriptionPlan = 'free' | 'pro'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'none'

export interface SellerOperational {
  stripe_account_id: string | null
  stripe_account_status: string | null
  stripe_onboarding_complete: boolean
  stripe_payouts_enabled: boolean
  operating_model: string
  subscription_plan: SubscriptionPlan
  subscription_status: SubscriptionStatus
  subscription_current_period_end: string | null
  subscription_cancel_at_period_end: boolean
  subscription_customer_id: string | null
  uses_integrated_payments: boolean
  // subscription_provider / subscription_external_id are deliberately not
  // returned by the RPC — the portal only needs the customer id.
  updated_at: string | null
}

export async function fetchSellerOperational(
  sellerId: string
): Promise<{ data: SellerOperational | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_seller_operational', {
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
