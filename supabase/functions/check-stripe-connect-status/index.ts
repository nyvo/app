// Check the current Stripe Connect (Express) onboarding status for a seller.
// Auth + service-role write of the write-protected stripe_* columns.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyAuthAndOrgMembership,
  handleCors,
  errorResponse,
  successResponse,
} from '../_shared/auth.ts'
import { retrieveAccount, type StripeConnectedAccount } from '../_shared/stripe.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface StatusRequest {
  sellerId: string
}

type AccountStatus = 'pending' | 'enabled' | 'restricted' | 'rejected'

/**
 * Map a Stripe connected account onto our stripe_account_status enum.
 * Order matters: an account that hasn't finished hosted onboarding is always
 * 'pending', a Stripe-rejected account is 'rejected', a fully usable account is
 * 'enabled', and anything else (verification pending, missing requirements) is
 * 'restricted'.
 */
function mapAccountStatus(account: StripeConnectedAccount): AccountStatus {
  if (account.details_submitted === false) return 'pending'
  if (account.requirements?.disabled_reason?.startsWith('rejected')) return 'rejected'
  if (account.charges_enabled === true) return 'enabled'
  return 'restricted'
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const body = (await req.json()) as StatusRequest
    if (!body.sellerId) {
      return errorResponse('sellerId is required', 400, req)
    }

    const auth = await verifyAuthAndOrgMembership(req, body.sellerId, ['owner'])
    if (!auth.authenticated) return errorResponse(auth.error || 'Ikke innlogget', 401, req)
    if (!auth.authorized) return errorResponse(auth.error || 'Ingen tilgang', 403, req)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, stripe_account_id, stripe_onboarding_complete, stripe_account_status')
      .eq('id', body.sellerId)
      .single()

    if (sellerError || !seller) {
      return errorResponse('Fant ikke selgeren', 404, req)
    }

    // No connected account yet — onboarding hasn't started. Not an error.
    if (!seller.stripe_account_id) {
      return successResponse(
        { status: 'pending', onboarding_complete: false, requirements_due: [] },
        200,
        req,
      )
    }

    const account = await retrieveAccount(seller.stripe_account_id)
    const status = mapAccountStatus(account)
    const onboardingComplete = account.charges_enabled === true

    // Surface the requirements blocking the studio so the UI can prompt them.
    const requirementsDue: string[] = [
      ...(account.requirements?.currently_due ?? []),
      ...(account.requirements?.past_due ?? []),
    ]

    // Persist only when changed — the stripe_* columns are write-protected, so
    // this must go through the SERVICE-ROLE client.
    if (
      seller.stripe_account_status !== status ||
      seller.stripe_onboarding_complete !== onboardingComplete
    ) {
      const { error: updateError } = await supabase
        .from('sellers')
        .update({
          stripe_account_status: status,
          stripe_onboarding_complete: onboardingComplete,
        })
        .eq('id', body.sellerId)

      if (updateError) {
        console.error('check-stripe-connect-status update error:', updateError)
      }
    }

    return successResponse(
      {
        status,
        onboarding_complete: onboardingComplete,
        requirements_due: requirementsDue,
      },
      200,
      req,
    )
  } catch (err) {
    console.error('check-stripe-connect-status error:', err)
    return errorResponse('Noe gikk galt. Prøv igjen.', 500, req)
  }
})
