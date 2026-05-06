import { supabase } from '@/lib/supabase';
import type { TeamAffiliation, TeamAffiliationStatus } from '@/types/database';

// ---------------------------------------------------------------------------
// Storefront syndication: Inspire Yogastudio invites Anna's seller to
// advertise courses on Inspire's storefront. Studio-initiates only — invite
// is created with status='pending', the freelancer accepts (status='active')
// or declines (status='declined'). RLS enforces who can read/write each row.
// ---------------------------------------------------------------------------

/** Affiliation row + the studio team's display info for the freelancer view. */
export interface IncomingInvite {
  team_id: string;
  seller_id: string;
  status: TeamAffiliationStatus;
  invited_at: string;
  team: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    cover_image_url: string | null;
  };
}

/** Affiliation row + the affiliated seller's display info for the studio view. */
export interface OutgoingAffiliate {
  team_id: string;
  seller_id: string;
  status: TeamAffiliationStatus;
  invited_at: string;
  responded_at: string | null;
  seller: {
    id: string;
    name: string;
    city: string | null;
    logo_url: string | null;
  };
}

/**
 * Fetch every affiliation involving any of the user's sellers as the
 * INVITED side. RLS exposes both pending and historical (declined) rows;
 * the caller filters as needed.
 */
export async function fetchIncomingInvites(
  sellerIds: string[],
): Promise<{ data: IncomingInvite[]; error: Error | null }> {
  if (sellerIds.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from('team_affiliations')
    .select(`
      team_id, seller_id, status, invited_at,
      team:teams!inner(id, slug, name, description, cover_image_url)
    `)
    .in('seller_id', sellerIds)
    .order('invited_at', { ascending: false });

  if (error) return { data: [], error: error as Error };
  return {
    data: (data ?? []) as unknown as IncomingInvite[],
    error: null,
  };
}

/**
 * Fetch every affiliation FOR a specific team (the studio side). Caller is
 * the team admin; RLS enforces.
 */
export async function fetchTeamAffiliates(
  teamId: string,
): Promise<{ data: OutgoingAffiliate[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('team_affiliations')
    .select(`
      team_id, seller_id, status, invited_at, responded_at,
      seller:sellers!inner(id, name, city, logo_url)
    `)
    .eq('team_id', teamId)
    .order('invited_at', { ascending: false });

  if (error) return { data: [], error: error as Error };
  return {
    data: (data ?? []) as unknown as OutgoingAffiliate[],
    error: null,
  };
}

/**
 * Studio invites a freelancer by email. We resolve the email to a seller
 * via the seller_members → profiles join (a seller's "owner" is the
 * profile that signed up for it). If multiple sellers share an owner,
 * pick the first; the freelancer can reject if it's the wrong one.
 */
export async function inviteAffiliateByEmail(input: {
  teamId: string;
  email: string;
  inviterUserId: string;
}): Promise<{ error: Error | null }> {
  const normalized = input.email.trim().toLowerCase();

  // Resolve email → user_id → seller_members.seller_id. Pick the seller
  // where the user is owner (one row per user under the current model).
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', normalized)
    .maybeSingle();

  if (profileError) return { error: profileError as Error };
  if (!profile) {
    return { error: new Error('Fant ingen bruker med denne e-postadressen.') };
  }

  const { data: membership, error: memberError } = await supabase
    .from('seller_members')
    .select('seller_id')
    .eq('user_id', (profile as { id: string }).id)
    .eq('role', 'owner')
    .maybeSingle();

  if (memberError) return { error: memberError as Error };
  if (!membership) {
    return { error: new Error('Brukeren har ingen virksomhet å invitere ennå.') };
  }

  const sellerId = (membership as { seller_id: string }).seller_id;

  // Insert the invite. RLS rejects if (a) caller isn't team admin, or (b)
  // seller_id matches the team's owner_seller_id (self-invite).
  const { error } = await supabase.from('team_affiliations').insert({
    team_id: input.teamId,
    seller_id: sellerId,
    status: 'pending',
    invited_by: input.inviterUserId,
  });

  if (error) {
    // Friendlier message for unique-violation (already invited).
    if (error.code === '23505') {
      return { error: new Error('Denne sammen er allerede invitert.') };
    }
    return { error: error as Error };
  }

  return { error: null };
}

/**
 * Freelancer accepts or declines an invite. RLS restricts to the
 * affiliated seller's members.
 */
export async function respondToInvite(input: {
  teamId: string;
  sellerId: string;
  accept: boolean;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('team_affiliations')
    .update({
      status: input.accept ? 'active' : 'declined',
      responded_at: new Date().toISOString(),
    })
    .eq('team_id', input.teamId)
    .eq('seller_id', input.sellerId);

  if (error) return { error: error as Error };
  return { error: null };
}

/**
 * Either side withdraws the affiliation. RLS allows team admin OR
 * affiliated seller members. The cleanup trigger removes any
 * course_team_listings tied to this (team, seller) pair.
 */
export async function revokeAffiliation(input: {
  teamId: string;
  sellerId: string;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('team_affiliations')
    .delete()
    .eq('team_id', input.teamId)
    .eq('seller_id', input.sellerId);

  if (error) return { error: error as Error };
  return { error: null };
}

// ---------------------------------------------------------------------------
// Course listings — per-course opt-in for a freelancer's courses to appear
// on a venue's storefront. Listing requires an active team_affiliation
// between the course's owning seller and the team (RLS enforces).
// ---------------------------------------------------------------------------

/**
 * Returns the set of course IDs (owned by `sellerId`) currently listed on
 * `teamId`. Used to drive checkbox state in the toggle UI.
 */
export async function fetchListedCourseIds(input: {
  teamId: string;
  sellerId: string;
}): Promise<{ data: Set<string>; error: Error | null }> {
  const { data, error } = await supabase
    .from('course_team_listings')
    .select('course_id, courses!inner(seller_id)')
    .eq('team_id', input.teamId)
    .eq('courses.seller_id', input.sellerId);

  if (error) return { data: new Set(), error: error as Error };
  const ids = new Set<string>();
  for (const row of (data ?? []) as Array<{ course_id: string }>) {
    ids.add(row.course_id);
  }
  return { data: ids, error: null };
}

/**
 * Add a course to a team's storefront. Requires an active affiliation.
 * Idempotent — if the row already exists, the unique-violation is
 * swallowed and reported as success.
 */
export async function addCourseListing(input: {
  courseId: string;
  teamId: string;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('course_team_listings').insert({
    course_id: input.courseId,
    team_id: input.teamId,
  });
  if (error && error.code !== '23505') {
    return { error: error as Error };
  }
  return { error: null };
}

/** Remove a course from a team's storefront. */
export async function removeCourseListing(input: {
  courseId: string;
  teamId: string;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('course_team_listings')
    .delete()
    .eq('course_id', input.courseId)
    .eq('team_id', input.teamId);
  if (error) return { error: error as Error };
  return { error: null };
}

// Re-export the canonical type for consumers.
export type { TeamAffiliation };
