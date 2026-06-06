// Check the current Dintero seller approval status for an organization.
// Replaces check-stripe-status.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyAuthAndOrgMembership,
  handleCors,
  errorResponse,
  successResponse,
} from '../_shared/auth.ts'
import { getSellerApproval, type DinteroSellerApproval } from '../_shared/dintero.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface StatusRequest {
  /** Seller UUID. External name kept for client compatibility. */
  organizationId: string
}

type CaseStatus = DinteroSellerApproval['case_status']

function statusIsActive(s: CaseStatus | string | undefined | null): boolean {
  return s === 'ACTIVE'
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const body = (await req.json()) as StatusRequest
    if (!body.organizationId) {
      return errorResponse('organizationId is required', 400, req)
    }

    const auth = await verifyAuthAndOrgMembership(req, body.organizationId, ['owner', 'admin'])
    if (!auth.authenticated) return errorResponse(auth.error || 'Not authenticated', 401, req)
    if (!auth.authorized) return errorResponse(auth.error || 'Not authorized', 403, req)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select(
        'id, dintero_seller_id, dintero_approval_id, dintero_contract_url, dintero_onboarding_status, dintero_onboarding_complete',
      )
      .eq('id', body.organizationId)
      .single()

    if (sellerError || !seller) {
      return errorResponse('Seller not found', 404, req)
    }

    if (!seller.dintero_approval_id) {
      return successResponse({ onboardingComplete: false, status: null }, 200, req)
    }

    if (seller.dintero_onboarding_status === 'ACTIVE') {
      return successResponse({
        onboardingComplete: true,
        status: 'ACTIVE',
        sellerId: seller.dintero_seller_id,
      }, 200, req)
    }

    const approval = await getSellerApproval(seller.dintero_approval_id)
    const caseStatus: CaseStatus = approval.case_status
    const contractUrl =
      approval.links?.find((l) => l.rel === 'contract_url')?.href ?? seller.dintero_contract_url

    const onboardingComplete = statusIsActive(caseStatus)

    await supabase
      .from('sellers')
      .update({
        dintero_onboarding_status: caseStatus,
        dintero_onboarding_complete: onboardingComplete,
        dintero_contract_url: contractUrl,
      })
      .eq('id', body.organizationId)

    return successResponse({
      onboardingComplete,
      status: caseStatus,
      sellerId: seller.dintero_seller_id,
      contractUrl,
    }, 200, req)
  } catch (err) {
    console.error('check-dintero-seller-status error:', err)
    return errorResponse('Noe gikk galt. Prøv igjen.', 500, req)
  }
})
