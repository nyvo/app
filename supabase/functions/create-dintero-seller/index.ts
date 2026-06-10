// Initiate Dintero Seller (payout destination) onboarding.
// Replaces create-stripe-connect-link.
//
// Flow:
//  1. Teacher submits their org number via the UI.
//  2. We POST to /v1/accounts/{aid}/management/settings/approvals/payout-destinations.
//  3. Dintero returns a hosted KYC URL in links[rel=contract_url].
//  4. We save approval_id + contract_url on the seller.
//  5. Teacher fills bank details + identity inside Dintero's hosted KYC form.
//
// We return `contractUrl` so the client can open it in a new tab.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyAuthAndOrgMembership,
  handleCors,
  errorResponse,
  successResponse,
} from '../_shared/auth.ts'
import {
  createSellerApproval,
  isSandbox,
  type DinteroSellerApprovalRequest,
} from '../_shared/dintero.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface SellerRequest {
  sellerId: string
  /** Norwegian organisation number — Dintero's vocabulary, kept literal. */
  organizationNumber: string
  sandboxAutoApprove?: boolean
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const body = (await req.json()) as SellerRequest

    if (!body.sellerId) {
      return errorResponse('sellerId is required', 400, req)
    }
    if (!body.organizationNumber) {
      return errorResponse('organizationNumber is required', 400, req)
    }

    const auth = await verifyAuthAndOrgMembership(req, body.sellerId, ['owner', 'admin'])
    if (!auth.authenticated) return errorResponse(auth.error || 'Not authenticated', 401, req)
    if (!auth.authorized) return errorResponse(auth.error || 'Not authorized', 403, req)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, name, dintero_seller_id, dintero_approval_id, dintero_contract_url, dintero_onboarding_status, subscription_plan, subscription_status')
      .eq('id', body.sellerId)
      .single()

    if (sellerError || !seller) {
      return errorResponse('Seller not found', 404, req)
    }

    // INV-1 (phase 3): only sellers with an active Pro subscription may become
    // Dintero payout destinations — registration is what triggers the
    // per-seller cost, so it is strictly gated behind a paying sub.
    if (seller.subscription_plan !== 'pro' || seller.subscription_status !== 'active') {
      return errorResponse('Integrert betaling krever et aktivt Pro-abonnement', 403, req)
    }

    // Already active — nothing to do
    if (seller.dintero_onboarding_status === 'ACTIVE') {
      return successResponse({
        status: 'ACTIVE',
        sellerId: seller.dintero_seller_id,
        contractUrl: null,
        alreadyOnboarded: true,
      }, 200, req)
    }

    // Already submitted — return the stored contract URL so the teacher can resume
    if (seller.dintero_approval_id && seller.dintero_contract_url) {
      return successResponse({
        status: seller.dintero_onboarding_status || 'PENDING',
        sellerId: seller.dintero_seller_id,
        approvalId: seller.dintero_approval_id,
        contractUrl: seller.dintero_contract_url,
        resumed: true,
      }, 200, req)
    }

    // Use the seller id as our platform-side payout destination id — stable
    // and easy to reconcile. Dintero wants a UUID-shaped string for both
    // payout_destination_id and payout_reference.
    const sellerId = seller.id

    const approvalRequest: DinteroSellerApprovalRequest = {
      country_code: 'NO',
      currency: 'NOK',
      organization_number: body.organizationNumber,
      payout_destination_id: sellerId,
      payout_reference: sellerId,
      bank_accounts: [
        {
          bank_account_currency: 'NOK',
          payout_currency: 'NOK',
        },
      ],
    }

    if (isSandbox() && body.sandboxAutoApprove) {
      approvalRequest.payout_destination_description = 'AUTO_APPROVE'
    }

    const approval = await createSellerApproval(approvalRequest)
    const contractUrl = approval.links?.find((l) => l.rel === 'contract_url')?.href ?? null

    const { error: updateError } = await supabase
      .from('sellers')
      .update({
        dintero_seller_id: sellerId,
        dintero_approval_id: approval.id,
        dintero_contract_url: contractUrl,
        dintero_onboarding_status: approval.case_status || 'PENDING',
        dintero_onboarding_complete: approval.case_status === 'ACTIVE',
      })
      .eq('id', body.sellerId)

    if (updateError) {
      return errorResponse('Failed to persist Dintero seller record', 500, req)
    }

    return successResponse({
      status: approval.case_status || 'PENDING',
      sellerId,
      approvalId: approval.id,
      contractUrl,
    }, 200, req)
  } catch (err) {
    console.error('create-dintero-seller error:', err)
    return errorResponse('Noe gikk galt. Prøv igjen.', 500, req)
  }
})
