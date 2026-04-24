// Initiate Dintero Seller (payout destination) onboarding.
// Replaces create-stripe-connect-link.
//
// Flow:
//  1. Teacher submits their org number via the UI.
//  2. We POST to /v1/accounts/{aid}/management/settings/approvals/payout-destinations.
//  3. Dintero returns a hosted KYC URL in links[rel=contract_url].
//  4. We save approval_id + contract_url on the organization.
//  5. If `form_submitter.email` is provided, Dintero emails the teacher directly.
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
  organizationId: string
  organizationNumber: string
  businessName: string
  contactEmail: string
  contactName?: string
  bankAccountNumber: string
  bankName: string
  bankAccountType?: 'bban' | 'iban'
  sandboxAutoApprove?: boolean
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const body = (await req.json()) as SellerRequest

    if (!body.organizationId) {
      return errorResponse('organizationId is required', 400, req)
    }
    if (!body.organizationNumber || !body.businessName || !body.contactEmail) {
      return errorResponse('Missing required fields: organizationNumber, businessName, contactEmail', 400, req)
    }
    if (!body.bankAccountNumber || !body.bankName) {
      return errorResponse('Missing required fields: bankAccountNumber, bankName', 400, req)
    }

    // Strip formatting from bank account (Norwegian BBAN commonly written as 1234.56.78901)
    const normalizedBankAccount = body.bankAccountNumber.replace(/[^\dA-Z]/gi, '')
    const accountType: 'bban' | 'iban' = body.bankAccountType
      ?? (normalizedBankAccount.startsWith('NO') ? 'iban' : 'bban')

    const auth = await verifyAuthAndOrgMembership(req, body.organizationId, ['owner', 'admin'])
    if (!auth.authenticated) return errorResponse(auth.error || 'Not authenticated', 401, req)
    if (!auth.authorized) return errorResponse(auth.error || 'Not authorized', 403, req)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, dintero_seller_id, dintero_approval_id, dintero_contract_url, dintero_onboarding_status')
      .eq('id', body.organizationId)
      .single()

    if (orgError || !org) {
      return errorResponse('Organization not found', 404, req)
    }

    // Already active — nothing to do
    if (org.dintero_onboarding_status === 'ACTIVE') {
      return successResponse({
        status: 'ACTIVE',
        sellerId: org.dintero_seller_id,
        contractUrl: null,
        alreadyOnboarded: true,
      }, 200, req)
    }

    // Already submitted — return the stored contract URL so the teacher can resume
    if (org.dintero_approval_id && org.dintero_contract_url) {
      return successResponse({
        status: org.dintero_onboarding_status || 'PENDING',
        sellerId: org.dintero_seller_id,
        approvalId: org.dintero_approval_id,
        contractUrl: org.dintero_contract_url,
        resumed: true,
      }, 200, req)
    }

    // Use the org id as our platform-side seller id — stable and easy to reconcile.
    // Dintero wants a UUID-shaped string for both payout_destination_id and payout_reference.
    const sellerId = org.id

    const approvalRequest: DinteroSellerApprovalRequest = {
      country_code: 'NO',
      currency: 'NOK',
      organization_number: body.organizationNumber,
      business_name: body.businessName,
      payout_destination_id: sellerId,
      payout_reference: sellerId,
      payout_destination_name: body.businessName,
      bank_accounts: [
        {
          account_number: normalizedBankAccount,
          account_number_type: accountType,
          bank_name: body.bankName,
          bank_account_currency: 'NOK',
          payout_currency: 'NOK',
        },
      ],
      form_submitter: {
        email: body.contactEmail,
        name: body.contactName || body.businessName,
      },
    }

    if (isSandbox() && body.sandboxAutoApprove) {
      approvalRequest.payout_destination_description = 'AUTO_APPROVE'
    }

    const approval = await createSellerApproval(approvalRequest)
    const contractUrl = approval.links?.find((l) => l.rel === 'contract_url')?.href ?? null

    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        dintero_seller_id: sellerId,
        dintero_approval_id: approval.id,
        dintero_contract_url: contractUrl,
        dintero_onboarding_status: approval.case_status || 'PENDING',
        dintero_onboarding_complete: approval.case_status === 'ACTIVE',
      })
      .eq('id', body.organizationId)

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
    const message = err instanceof Error ? err.message : 'Unknown error'
    return errorResponse(message, 500, req)
  }
})
