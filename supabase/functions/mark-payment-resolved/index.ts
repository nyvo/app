// Teacher action: mark a signup as paid without going through Dintero.
// Used when the participant has paid offline (cash, Vipps direct, bank
// transfer) and the teacher wants to reconcile the record.
//
// Previously this was a direct client-side UPDATE guarded only by RLS.
// Moving it server-side adds defence-in-depth: explicit org-membership
// check, UUID validation, current-state check (don't re-mark already-paid
// or refunded signups), and an audit trail via payment_audit_log's
// existing trigger on signups.payment_status changes.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyAuth,
  verifyOrgMembership,
  handleCors,
  errorResponse,
  successResponse,
} from '../_shared/auth.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface MarkPaymentResolvedRequest {
  signup_id: string
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const authResult = await verifyAuth(req)
    if (!authResult.authenticated) {
      return errorResponse(authResult.error || 'Unauthorized', 401, req)
    }

    const body = (await req.json()) as MarkPaymentResolvedRequest
    if (!body.signup_id || !UUID_REGEX.test(body.signup_id)) {
      return errorResponse('Invalid signup_id', 400, req)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Load signup + its org for authorization. Service role bypasses RLS
    // intentionally — we use the explicit org-membership check below as
    // the authoritative gate.
    const { data: signup, error: signupError } = await supabase
      .from('signups')
      .select('id, organization_id, payment_status, status')
      .eq('id', body.signup_id)
      .single()

    if (signupError || !signup) {
      return errorResponse('Signup not found', 404, req)
    }

    // Only org members (owner/admin/teacher) can reconcile payments.
    const authzResult = await verifyOrgMembership(authResult.userId!, signup.organization_id, [
      'owner',
      'admin',
      'teacher',
    ])
    if (!authzResult.authorized) {
      return errorResponse('You do not have permission to update payments for this organization', 403, req)
    }

    // Don't overwrite already-paid or refunded signups. Teacher can fix
    // via the cancel-with-refund flow if they need to reverse.
    if (signup.payment_status === 'paid') {
      return errorResponse('Signup is already marked as paid', 400, req)
    }
    if (signup.payment_status === 'refunded') {
      return errorResponse('Cannot mark a refunded signup as paid', 400, req)
    }

    const { error: updateError } = await supabase
      .from('signups')
      .update({
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.signup_id)

    if (updateError) {
      return errorResponse('Failed to update signup', 500, req)
    }

    // The payment_audit_log trigger on signups.payment_status captures
    // the change automatically — no explicit audit insert needed here.

    return successResponse({ success: true, signup_id: body.signup_id }, 200, req)
  } catch (err) {
    console.error('mark-payment-resolved error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return errorResponse(message, 500, req)
  }
})
