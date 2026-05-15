import { supabase } from '@/lib/supabase';
import type {
  LookupTeamInviteLinkResult,
  RedeemTeamInviteLinkResult,
  TeamInviteLink,
} from '@/types/database';

// ---------------------------------------------------------------------------
// Team invite links — shareable codes that replace the old email-based invite.
//
// Lifecycle:
//   - Studio admin calls createInviteLink(teamId) → new active link (any prior
//     link for the team is revoked server-side).
//   - The studio shares the link out of band (DM/SMS/etc).
//   - Invitee opens /join/:code → lookupInviteLink(code) renders the join page.
//   - Invitee confirms → redeemInviteLink(code) creates the team_affiliation
//     immediately as 'active' (no pending step).
//
// The redeem flow handles the single-team-at-a-time constraint by returning
// `in_other_team` on the first call; the join page surfaces the consequence
// and re-invokes with `forceLeave: true` after the user confirms.
// ---------------------------------------------------------------------------

/** Fetch the currently active link for a team (admin UI). null if none. */
export async function fetchActiveInviteLink(
  teamId: string,
): Promise<{ data: TeamInviteLink | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('team_invite_links')
    .select('*')
    .eq('team_id', teamId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error as Error };
  return { data: (data as TeamInviteLink | null) ?? null, error: null };
}

/** Generate a fresh link, revoking any prior active link. Admin-only (RLS). */
export async function createInviteLink(
  teamId: string,
): Promise<{ data: TeamInviteLink | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('create_team_invite_link', {
    p_team_id: teamId,
  });
  if (error) return { data: null, error: error as Error };
  return { data: (data as TeamInviteLink) ?? null, error: null };
}

/** Revoke the currently active link (without creating a new one). */
export async function revokeInviteLink(
  linkId: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('team_invite_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', linkId);
  if (error) return { error: error as Error };
  return { error: null };
}

/** Public — accessible to anon. Returns team display info for the join page. */
export async function lookupInviteLink(
  code: string,
): Promise<{ data: LookupTeamInviteLinkResult | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('lookup_team_invite_link', {
    p_code: code,
  });
  if (error) return { data: null, error: error as Error };
  const row = Array.isArray(data) ? data[0] : null;
  return { data: (row as LookupTeamInviteLinkResult | null) ?? null, error: null };
}

/** Authenticated — redeem the code. See migration for status values. */
export async function redeemInviteLink(
  code: string,
  forceLeave = false,
): Promise<{ data: RedeemTeamInviteLinkResult | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('redeem_team_invite_link', {
    p_code: code,
    p_force_leave: forceLeave,
  });
  if (error) return { data: null, error: error as Error };
  const row = Array.isArray(data) ? data[0] : null;
  return { data: (row as RedeemTeamInviteLinkResult | null) ?? null, error: null };
}
