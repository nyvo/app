import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Seller email invitations — a studio invites a named instructor by email.
//
// Lifecycle:
//   - Studio owner submits an address → send-instructor-invite Edge Function
//     creates the row (RPC enforces owner + studio-only) and emails the
//     accept link.
//   - The invitee accepts via /join/:token, or — when they already have an
//     account on that address — via the Godta row on /samarbeid.
//   - Send på nytt re-mails the same token; Fjern revokes it.
//
// Replaces the shareable invite-link mechanism (services/invite-links.ts,
// kept only until the legacy RPCs are dropped).
// ---------------------------------------------------------------------------

/** A pending invitation as the host sees it (token never reaches the host UI). */
export interface SellerInvitation {
  id: string;
  host_seller_id: string;
  email: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  created_at: string;
  expires_at: string;
}

/** A pending invitation as the invitee sees it on /samarbeid — includes the
 *  token (it is their invite) and the inviting studio's identity. */
export interface ReceivedInvitation extends SellerInvitation {
  token: string;
  host: { id: string; name: string; slug: string; logo_url: string | null } | null;
}

export interface LookupInvitationResult {
  status: 'valid' | 'accepted' | 'expired' | 'not_found';
  host_seller_id: string | null;
  name: string | null;
  slug: string | null;
}

export interface AcceptInvitationResult {
  status:
    | 'joined'
    | 'already_affiliated'
    | 'own_storefront'
    | 'no_seller'
    | 'wrong_email'
    | 'studio_account'
    | 'has_other_host'
    | 'expired'
    | 'not_found';
  existing_host_seller_id: string | null;
}

/** Pending invitations for a host studio, newest first (RLS: owner only). */
export async function fetchHostInvitations(
  hostSellerId: string,
): Promise<{ data: SellerInvitation[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('seller_invitations')
    .select('id, host_seller_id, email, status, created_at, expires_at')
    .eq('host_seller_id', hostSellerId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error as Error };
  return { data: (data ?? []) as SellerInvitation[], error: null };
}

/** The signed-in user's own pending invitation, if any (RLS: matched on the
 *  JWT email). Drives the Godta/Avslå row on the solo /samarbeid page. */
export async function fetchMyInvitation(): Promise<{
  data: ReceivedInvitation | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from('seller_invitations')
    .select(
      `
      id, host_seller_id, email, token, status, created_at, expires_at,
      host:sellers!seller_invitations_host_seller_id_fkey(id, name, slug, logo_url)
    `,
    )
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error as Error };
  return { data: (data as unknown as ReceivedInvitation | null) ?? null, error: null };
}

/** Create + email an invitation via the Edge Function. */
export async function sendInstructorInvite(
  sellerId: string,
  email: string,
): Promise<{ data: SellerInvitation | null; error: Error | null }> {
  const { data, error } = await supabase.functions.invoke('send-instructor-invite', {
    body: { sellerId, email },
  });
  if (error) return { data: null, error: error as Error };
  return { data: (data?.invitation as SellerInvitation) ?? null, error: null };
}

/** Re-email an existing pending invitation (same token). */
export async function resendInstructorInvite(
  invitationId: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.functions.invoke('send-instructor-invite', {
    body: { invitationId },
  });
  if (error) return { error: error as Error };
  return { error: null };
}

/** Host revokes a pending invitation. */
export async function revokeInvitation(invitationId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc('revoke_seller_invitation', {
    p_invitation_id: invitationId,
  });
  if (error) return { error: error as Error };
  return { error: null };
}

/** Public — accessible to anon. Drives /join/:token. */
export async function lookupInvitation(
  token: string,
): Promise<{ data: LookupInvitationResult | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('lookup_seller_invitation', { p_token: token });
  if (error) return { data: null, error: error as Error };
  const row = Array.isArray(data) ? data[0] : null;
  return { data: (row as LookupInvitationResult | null) ?? null, error: null };
}

/** Authenticated — accept. See the migration for status values. */
export async function acceptInvitation(
  token: string,
  forceLeave = false,
): Promise<{ data: AcceptInvitationResult | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('accept_seller_invitation', {
    p_token: token,
    p_force_leave: forceLeave,
  });
  if (error) return { data: null, error: error as Error };
  const row = Array.isArray(data) ? data[0] : null;
  return { data: (row as AcceptInvitationResult | null) ?? null, error: null };
}

/** Authenticated invitee — decline. */
export async function declineInvitation(token: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc('decline_seller_invitation', { p_token: token });
  if (error) return { error: error as Error };
  return { error: null };
}
