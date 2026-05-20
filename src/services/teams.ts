import { supabase, typedFrom } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { Team } from '@/types/database'

// ---------------------------------------------------------------------------
// Studio (team) services. Each seller has exactly one team auto-created on
// signup — the public-facing storefront.
//
// The previous shared-studio admin/tenant model (invite codes, multi-member
// teams) is retired in favour of team_affiliations (see services/affiliations).
// All that's left here is updateTeam — used inline on the Studio page to
// maintain the storefront's display fields (name, cover).
// ---------------------------------------------------------------------------

/**
 * Public projection — what anon/authenticated reads see on the public page.
 * Kept as an exported interface because public storefront components import
 * it directly.
 */
export interface PublicTeam {
  id: string
  slug: string
  name: string
  cover_image_url: string | null
}

/**
 * Update a team's display fields (name, cover). Address + city live on the
 * owning seller — edit those via `updateSeller` instead. Slug and
 * invite_code are deliberately not editable. RLS gates the write through
 * `is_team_admin`.
 */
export async function updateTeam(
  teamId: string,
  patch: {
    name?: string
    cover_image_url?: string | null
  },
): Promise<{ data: Team | null; error: Error | null }> {
  const { data, error } = await typedFrom('teams')
    .update(patch)
    .eq('id', teamId)
    .select()
    .single()

  if (error) {
    logger.error('Error updating team:', error)
    return { data: null, error: error as Error }
  }
  return { data: data as Team, error: null }
}

/**
 * Rename a team's public slug. The previous slug is archived in
 * team_slug_aliases so links shared in the wild keep resolving via a
 * client-side redirect on the public storefront.
 *
 * RPC enforces owner-only writes, the same normalization + reserved-list as
 * onboarding, and uniqueness against both current slugs and archived aliases.
 * Returns the canonical normalized slug on success.
 */
export async function renameTeamSlug(
  teamId: string,
  newSlug: string,
): Promise<{ slug: string | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('rename_team_slug', {
    p_team_id: teamId,
    p_new_slug: newSlug,
  })

  if (error) {
    return { slug: null, error: error as Error }
  }
  return { slug: data as string, error: null }
}
