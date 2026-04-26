import { supabase, typedFrom } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { extractEdgeError } from '@/lib/edge-errors'
import type { Space, SpaceMemberRole } from '@/types/database'

// ============================================================================
// Public projection — what anon/authenticated reads see on the public page
// ============================================================================

export interface PublicSpace {
  id: string
  slug: string
  name: string
  description: string | null
  address: string | null
  city: string | null
  cover_image_url: string | null
}

export interface SpaceWithMembers {
  space: PublicSpace
  memberOrganizationIds: string[]
}

// ============================================================================
// Dashboard projections — what /teacher/studio renders
// ============================================================================

/**
 * A space the signed-in user belongs to via one of their orgs, with the role
 * derived. `invite_code` is included only when myRole='admin' (RLS gates this
 * via the owning org's read policy plus our select-list).
 */
export interface MySpace {
  id: string
  slug: string
  name: string
  description: string | null
  address: string | null
  city: string | null
  cover_image_url: string | null
  invite_code: string | null
  myRole: SpaceMemberRole
  myOrganizationId: string
}

/**
 * A row in the admin's members list — the org joined to the space, with role.
 */
export interface SpaceMemberRow {
  organization_id: string
  role: SpaceMemberRole
  joined_at: string
  organization: {
    id: string
    slug: string
    name: string
    city: string | null
    default_course_image_url: string | null
  }
}

// ============================================================================
// Public space-page query (used by /space/:slug, the marketing page)
// ============================================================================

export async function fetchSpaceBySlug(
  slug: string,
): Promise<{ data: SpaceWithMembers | null; error: Error | null }> {
  const { data: space, error: spaceError } = await supabase
    .from('spaces')
    .select('id, slug, name, description, address, city, cover_image_url')
    .eq('slug', slug)
    .maybeSingle()

  if (spaceError) {
    logger.error('Error fetching space:', spaceError)
    return { data: null, error: spaceError as Error }
  }
  if (!space) return { data: null, error: null }

  const typedSpace = space as PublicSpace

  const { data: members, error: membersError } = await supabase
    .from('space_members')
    .select('organization_id')
    .eq('space_id', typedSpace.id)

  if (membersError) {
    logger.error('Error fetching space members:', membersError)
    return { data: null, error: membersError as Error }
  }

  return {
    data: {
      space: typedSpace,
      memberOrganizationIds: (members ?? []).map(
        (m) => (m as { organization_id: string }).organization_id,
      ),
    },
    error: null,
  }
}

// ============================================================================
// Dashboard reads
// ============================================================================

/**
 * All spaces the user belongs to (via any of their orgs), with their role and
 * — for admin spaces — the invite code.
 *
 * RLS: `space_members` SELECT is allowed for org members; `spaces` SELECT is
 * public. The `invite_code` column is only meaningful for admins; we filter
 * the field client-side based on the row's role.
 */
export async function fetchMySpaces(
  organizationIds: string[],
): Promise<{ data: MySpace[]; error: Error | null }> {
  if (organizationIds.length === 0) {
    return { data: [], error: null }
  }

  const { data, error } = await supabase
    .from('space_members')
    .select(`
      role,
      organization_id,
      space:spaces!inner (
        id, slug, name, description, address, city, cover_image_url, invite_code
      )
    `)
    .in('organization_id', organizationIds)

  if (error) {
    logger.error('Error fetching my spaces:', error)
    return { data: [], error: error as Error }
  }

  type Row = {
    role: SpaceMemberRole
    organization_id: string
    space: PublicSpace & { invite_code: string }
  }
  const rows = (data ?? []) as unknown as Row[]

  const result: MySpace[] = rows.map((r) => ({
    id: r.space.id,
    slug: r.space.slug,
    name: r.space.name,
    description: r.space.description,
    address: r.space.address,
    city: r.space.city,
    cover_image_url: r.space.cover_image_url,
    // Hide the invite code from non-admins, even though RLS lets it through
    // (defence-in-depth — the code is meant for admins only).
    invite_code: r.role === 'admin' ? r.space.invite_code : null,
    myRole: r.role,
    myOrganizationId: r.organization_id,
  }))

  result.sort((a, b) => a.name.localeCompare(b.name, 'nb-NO'))
  return { data: result, error: null }
}

/**
 * Members of a space, joined with their org info. Used by the admin card's
 * "Medlemmer (N)" list. RLS: org members can read their own row; admin-org
 * members can read all rows for the space (via `is_space_admin`).
 */
export async function fetchSpaceMembers(
  spaceId: string,
): Promise<{ data: SpaceMemberRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('space_members')
    .select(`
      organization_id,
      role,
      joined_at,
      organization:organizations!inner (
        id, slug, name, city, default_course_image_url
      )
    `)
    .eq('space_id', spaceId)

  if (error) {
    logger.error('Error fetching space members:', error)
    return { data: [], error: error as Error }
  }

  const rows = (data ?? []) as unknown as SpaceMemberRow[]
  rows.sort((a, b) => {
    if (a.role !== b.role) return a.role === 'admin' ? -1 : 1
    return a.organization.name.localeCompare(b.organization.name, 'nb-NO')
  })
  return { data: rows, error: null }
}

// ============================================================================
// Mutations — most go through the space-actions edge function
// ============================================================================

export interface CreateSpaceInput {
  organizationId: string
  name: string
  slug: string
  city?: string | null
  description?: string | null
  coverImageUrl?: string | null
}

export interface CreateSpaceResult {
  space: { id: string; slug: string; name: string; invite_code: string }
  organization_id: string
}

export async function createSpace(
  input: CreateSpaceInput,
): Promise<{ data: CreateSpaceResult | null; error: Error | null; status?: number }> {
  const { data, error } = await supabase.functions.invoke<CreateSpaceResult>('space-actions', {
    body: {
      action: 'create',
      organization_id: input.organizationId,
      name: input.name,
      slug: input.slug,
      city: input.city ?? null,
      description: input.description ?? null,
      cover_image_url: input.coverImageUrl ?? null,
    },
  })

  if (error) {
    const { status, message } = await extractEdgeError(error)
    logger.error('createSpace failed:', { status, message })
    return {
      data: null,
      error: new Error(message || 'Kunne ikke opprette studio'),
      status,
    }
  }
  return { data: data ?? null, error: null }
}

export interface JoinSpaceResult {
  space: { id: string; slug: string; name: string }
  organization_id: string
  already_member?: boolean
}

export async function joinSpaceWithCode(args: {
  organizationId: string
  code: string
}): Promise<{ data: JoinSpaceResult | null; error: Error | null; status?: number }> {
  const { data, error } = await supabase.functions.invoke<JoinSpaceResult>('space-actions', {
    body: {
      action: 'join-with-code',
      organization_id: args.organizationId,
      code: args.code,
    },
  })

  if (error) {
    const { status, message } = await extractEdgeError(error)
    logger.error('joinSpaceWithCode failed:', { status, message })
    return {
      data: null,
      error: new Error(message || 'Kunne ikke bli med'),
      status,
    }
  }
  return { data: data ?? null, error: null }
}

/**
 * Admin updates the space's name/city/description/cover_image. Slug + invite
 * code can't be changed via this path. RLS gates this through `is_space_admin`.
 */
export async function updateSpace(
  spaceId: string,
  patch: {
    name?: string
    description?: string | null
    address?: string | null
    city?: string | null
    cover_image_url?: string | null
  },
): Promise<{ data: Space | null; error: Error | null }> {
  const { data, error } = await typedFrom('spaces')
    .update(patch)
    .eq('id', spaceId)
    .select()
    .single()

  if (error) {
    logger.error('Error updating space:', error)
    return { data: null, error: error as Error }
  }
  return { data: data as Space, error: null }
}

/**
 * Admin removes a tenant from the space. RLS: "Space admins can remove members".
 * Also used by the tenant's own "Forlat studio" via the leave policy.
 */
export async function removeSpaceMember(
  spaceId: string,
  organizationId: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('space_members')
    .delete()
    .eq('space_id', spaceId)
    .eq('organization_id', organizationId)

  if (error) {
    logger.error('Error removing space member:', error)
    return { error: error as Error }
  }
  return { error: null }
}

/**
 * Admin deletes the entire space. Cascades to space_members. Use with care.
 */
export async function deleteSpace(spaceId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('spaces')
    .delete()
    .eq('id', spaceId)

  if (error) {
    logger.error('Error deleting space:', error)
    return { error: error as Error }
  }
  return { error: null }
}
