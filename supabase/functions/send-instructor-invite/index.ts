// send-instructor-invite — a studio owner invites an instructor by email.
//
// Two actions in one function:
//   { sellerId, email }  → create a fresh invitation (RPC as the caller, so
//                          the DB enforces owner + studio-only) and email it.
//   { invitationId }     → resend the existing pending invitation (same
//                          token, new email).
//
// Email dispatch goes through the shared send-email dispatcher; the accept
// link points at /join/:token on the caller's origin (validated against the
// CORS allowlist), falling back to SITE_URL.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  handleCors,
  errorResponse,
  successResponse,
  isAllowedOrigin,
  verifyAuthAndOrgMembership,
} from '../_shared/auth.ts'
import { sendEmail } from '../_shared/email.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface RequestBody {
  sellerId?: string
  email?: string
  invitationId?: string
}

interface InvitationRow {
  id: string
  host_seller_id: string
  email: string
  token: string
  status: string
  created_at: string
  expires_at: string
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const body = (await req.json()) as RequestBody

    const origin = req.headers.get('origin')
    const baseUrl = isAllowedOrigin(origin)
      ? (origin as string)
      : (Deno.env.get('SITE_URL') || 'http://localhost:5173')

    const admin = createClient(supabaseUrl, supabaseServiceKey)

    // ── Resend an existing pending invitation ─────────────────────────────
    if (body.invitationId) {
      const { data: row, error: rowError } = await admin
        .from('seller_invitations')
        .select('id, host_seller_id, email, token, status, created_at, expires_at')
        .eq('id', body.invitationId)
        .maybeSingle()
      if (rowError || !row) {
        return errorResponse('Fant ikke invitasjonen.', 404, req)
      }
      const invitation = row as InvitationRow

      const authz = await verifyAuthAndOrgMembership(req, invitation.host_seller_id, ['owner'])
      if (!authz.authenticated) return errorResponse('Du må være innlogget.', 401, req)
      if (!authz.authorized) return errorResponse('Du har ikke tilgang til dette studioet.', 403, req)

      if (invitation.status !== 'pending' || new Date(invitation.expires_at) < new Date()) {
        return errorResponse('Invitasjonen er ikke lenger aktiv.', 409, req)
      }

      const studioName = await fetchStudioName(admin, invitation.host_seller_id)
      const sent = await sendEmail({
        template: 'instructor-invite',
        to: invitation.email,
        props: { studioName, acceptUrl: `${baseUrl}/join/${invitation.token}` },
      })
      if (sent.error) {
        console.error('send-instructor-invite resend failed:', sent.error)
        return errorResponse('Kunne ikke sende e-posten. Prøv igjen.', 502, req)
      }
      return successResponse({ invitation: publicRow(invitation) }, 200, req)
    }

    // ── Create + send a new invitation ───────────────────────────────────
    if (!body.sellerId || !body.email) {
      return errorResponse('Ugyldig forespørsel.', 400, req)
    }

    const authz = await verifyAuthAndOrgMembership(req, body.sellerId, ['owner'])
    if (!authz.authenticated) return errorResponse('Du må være innlogget.', 401, req)
    if (!authz.authorized) return errorResponse('Du har ikke tilgang til dette studioet.', 403, req)

    // RPC as the calling user — the DB enforces owner + operating_model='studio'
    // + email validation, not just the check above.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    })
    const { data: created, error: createError } = await userClient.rpc('create_seller_invitation', {
      p_host_seller_id: body.sellerId,
      p_email: body.email,
    })
    if (createError || !created) {
      const msg = createError?.message ?? ''
      if (msg.includes('invalid_email')) return errorResponse('invalid_email', 400, req)
      if (msg.includes('not_studio')) return errorResponse('not_studio', 409, req)
      console.error('send-instructor-invite create failed:', createError)
      return errorResponse('Kunne ikke lage invitasjonen. Prøv igjen.', 500, req)
    }
    const invitation = created as InvitationRow

    const studioName = await fetchStudioName(admin, invitation.host_seller_id)
    const sent = await sendEmail({
      template: 'instructor-invite',
      to: invitation.email,
      props: { studioName, acceptUrl: `${baseUrl}/join/${invitation.token}` },
    })
    if (sent.error) {
      // The row exists — the UI shows the pending row with "Send på nytt" as
      // the recovery path, so surface the email failure honestly.
      console.error('send-instructor-invite send failed:', sent.error)
      return errorResponse('email_failed', 502, req)
    }

    return successResponse({ invitation: publicRow(invitation) }, 200, req)
  } catch (error) {
    console.error('send-instructor-invite error:', error)
    return errorResponse('Kunne ikke sende invitasjonen. Prøv igjen.', 500, req)
  }
})

async function fetchStudioName(
  admin: ReturnType<typeof createClient>,
  sellerId: string,
): Promise<string> {
  const { data } = await admin.from('sellers').select('name').eq('id', sellerId).maybeSingle()
  return (data as { name: string } | null)?.name ?? 'Studioet'
}

/** Strip the token before returning the row to the browser — the client never
 *  needs it (the invitee gets it by email), and not returning it keeps the
 *  copy-the-link temptation off the table. */
function publicRow(row: InvitationRow) {
  const { token: _token, ...rest } = row
  return rest
}
