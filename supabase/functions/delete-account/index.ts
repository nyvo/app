// Delete account — irreversibly removes the caller's account.
//
// Order matters:
//   1. Anonymize PII the law requires us to retain (bokføringsloven: 5 yrs of
//      payment records). We keep amounts/dates, drop name/email/phone.
//   2. Null out NO-ACTION FK references (courses.instructor_id,
//      team_affiliations.invited_by) so the cascade can proceed.
//   3. Delete sellers (studios) the user solely owns — cascades to courses,
//      signups, payment_attempts, seller_members, etc.
//   4. Delete auth.users — cascades to profiles → cascades to all remaining
//      rows pointing at the user.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyAuth,
  handleCors,
  errorResponse,
  successResponse,
} from '../_shared/auth.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const auth = await verifyAuth(req)
    if (!auth.authenticated || !auth.userId) {
      return errorResponse(auth.error || 'Unauthorized', 401, req)
    }
    const userId = auth.userId

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: authUser } = await supabase.auth.admin.getUserById(userId)
    const userEmail = authUser?.user?.email?.toLowerCase() ?? null

    // 1a. Anonymize signups bought by this user — seller still needs the
    // booking row for course history; we strip the personal fields.
    await supabase
      .from('signups')
      .update({
        participant_name: null,
        participant_email: null,
        participant_phone: null,
      })
      .eq('buyer_id', userId)

    // 1b. Anonymize payment_attempts matching this user's email
    // (bokføringsloven retention — keep the financial fields, drop PII).
    if (userEmail) {
      await supabase
        .from('payment_attempts')
        .update({
          participant_name: null,
          participant_email: null,
          participant_phone: null,
        })
        .ilike('participant_email', userEmail)
    }

    // 2. Clear NO-ACTION references that would otherwise block the delete.
    await supabase
      .from('courses')
      .update({ instructor_id: null })
      .eq('instructor_id', userId)

    await supabase
      .from('team_affiliations')
      .update({ invited_by: null })
      .eq('invited_by', userId)

    // 3. Delete sellers (studios) where the user is the sole owner. Other
    // memberships are removed by the seller_members cascade in step 4.
    const { data: ownedMemberships } = await supabase
      .from('seller_members')
      .select('seller_id')
      .eq('user_id', userId)
      .eq('role', 'owner')

    for (const row of ownedMemberships ?? []) {
      const sellerId = (row as { seller_id: string }).seller_id
      const { count } = await supabase
        .from('seller_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
        .eq('role', 'owner')
        .neq('user_id', userId)

      if ((count ?? 0) === 0) {
        const { error: sellerDeleteErr } = await supabase
          .from('sellers')
          .delete()
          .eq('id', sellerId)
        if (sellerDeleteErr) {
          // Surfacing the error lets us catch FK regressions early. The
          // teams.owner_seller_id CASCADE handles the storefront; anything
          // else blocking the delete means a new ref was added without an
          // ON DELETE policy.
          console.error('sellers delete failed:', sellerId, sellerDeleteErr)
          return errorResponse('Kunne ikke slette studio', 500, req)
        }
      }
    }

    // 4. Delete the auth user — cascades through profiles to the rest.
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId)
    if (deleteErr) {
      console.error('auth.admin.deleteUser failed:', deleteErr)
      return errorResponse('Kunne ikke slette kontoen', 500, req)
    }

    return successResponse({ ok: true }, 200, req)
  } catch (err) {
    console.error('delete-account error:', err)
    return errorResponse('Noe gikk galt', 500, req)
  }
})
