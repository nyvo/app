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
  const lookupSlug = slug.trim().toLowerCase()

  // Slug now lives on the team (one team per seller). Resolve seller via
  // the team's owner_seller_id. On miss, fall back to team_slug_aliases so
  // previously shared URLs keep resolving — callers compare `slug` to the
  // returned `PublicSeller.slug` and 301-style replace if they differ.
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('owner_seller_id, slug, default_course_image_url')
    .eq('slug', lookupSlug)
    .maybeSingle()

  if (teamError) {
    return { data: null, error: teamError as Error }
  }

  let teamRow:
    | { owner_seller_id: string; slug: string; default_course_image_url: string | null }
    | null = team
    ? (team as { owner_seller_id: string; slug: string; default_course_image_url: string | null })
    : null

  if (!teamRow) {
    const { data: alias, error: aliasError } = await supabase
      .from('team_slug_aliases')
      .select('team_id')
      .eq('old_slug', lookupSlug)
      .maybeSingle()

    if (aliasError) {
      return { data: null, error: aliasError as Error }
    }
    if (!alias) return { data: null, error: null }

    const aliasRow = alias as { team_id: string }
    const { data: aliasedTeam, error: aliasedTeamError } = await supabase
      .from('teams')
      .select('owner_seller_id, slug, default_course_image_url')
      .eq('id', aliasRow.team_id)
      .maybeSingle()

    if (aliasedTeamError) {
      return { data: null, error: aliasedTeamError as Error }
    }
    if (!aliasedTeam) return { data: null, error: null }

    teamRow = aliasedTeam as {
      owner_seller_id: string
      slug: string
      default_course_image_url: string | null
    }
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

/**
 * Browser-side seller update. Deliberately narrowed to the columns the
 * authenticated role holds an UPDATE grant on — everything else on sellers
 * is server-controlled (service-role edge functions / DEFINER RPCs).
 */
export async function updateSeller(
  id: string,
  updates: Pick<SellerUpdate, 'name' | 'logo_url'>
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
      closed_at: null,
      email: null,
      phone: null,
      dintero_seller_id: operational?.dintero_seller_id ?? null,
      dintero_approval_id: null,
      dintero_contract_url: null,
      dintero_onboarding_status: operational?.dintero_onboarding_status ?? null,
      settings: {},
      seller_type: operational?.seller_type ?? 'individual',
      organization_number: null,
      subscription_plan: operational?.subscription_plan ?? 'free',
      subscription_status: operational?.subscription_status ?? 'none',
      subscription_current_period_end: operational?.subscription_current_period_end ?? null,
      subscription_provider: null,
      subscription_external_id: null,
      uses_integrated_payments:
        operational?.subscription_plan === 'pro' && !!row.dintero_onboarding_complete,
      updated_at: operational?.updated_at ?? row.created_at,
    },
    error: null,
  }
}

/**
 * Operational seller fields that are not part of the public storefront
 * grant set. Fetched via a member-gated RPC; returns null for non-members.
 */
export type SubscriptionPlan = 'free' | 'pro'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'none'

export interface SellerOperational {
  dintero_seller_id: string | null
  dintero_onboarding_status: string | null
  seller_type: string
  subscription_plan: SubscriptionPlan
  subscription_status: SubscriptionStatus
  subscription_current_period_end: string | null
  // subscription_provider / subscription_external_id are deliberately not
  // returned by the RPC — billing linkage is server-side only.
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
