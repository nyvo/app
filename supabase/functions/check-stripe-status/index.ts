import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17.3.1'
import { verifyAuthAndOrgMembership, handleCors, errorResponse, successResponse } from '../_shared/auth.ts'

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
if (!stripeKey) {
  console.error('STRIPE_SECRET_KEY not configured')
}

const stripe = new Stripe(stripeKey || '', {
  apiVersion: '2024-12-18.acacia',
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface StatusRequest {
  organizationId: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { organizationId } = await req.json() as StatusRequest

    if (!organizationId) {
      return errorResponse('organizationId is required', 400)
    }

    // Verify auth + org membership (owner/admin only)
    const auth = await verifyAuthAndOrgMembership(req, organizationId, ['owner', 'admin'])
    if (!auth.authenticated) {
      return errorResponse(auth.error || 'Not authenticated', 401)
    }
    if (!auth.authorized) {
      return errorResponse(auth.error || 'Not authorized', 403)
    }

    // Fetch organization
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, stripe_account_id, stripe_onboarding_complete')
      .eq('id', organizationId)
      .single()

    if (orgError || !org) {
      return errorResponse('Organization not found', 404)
    }

    // No Stripe account yet
    if (!org.stripe_account_id) {
      return successResponse({ onboardingComplete: false })
    }

    // Already marked complete — skip Stripe API call
    if (org.stripe_onboarding_complete) {
      return successResponse({
        onboardingComplete: true,
        details: { charges_enabled: true, payouts_enabled: true, details_submitted: true },
      })
    }

    // Retrieve account from Stripe
    const account = await stripe.accounts.retrieve(org.stripe_account_id)

    // Log diagnostic fields for future refinement
    console.log('Stripe account status', {
      orgId: organizationId,
      accountId: org.stripe_account_id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      currently_due: account.requirements?.currently_due,
    })

    const details = {
      charges_enabled: !!account.charges_enabled,
      payouts_enabled: !!account.payouts_enabled,
      details_submitted: !!account.details_submitted,
    }

    // In test mode, charges_enabled may not be immediately true after onboarding.
    // details_submitted is the reliable signal that the user completed the flow.
    const isComplete = account.details_submitted && (account.charges_enabled || account.payouts_enabled)

    if (isComplete) {
      // Update org in database
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ stripe_onboarding_complete: true })
        .eq('id', organizationId)

      if (updateError) {
        console.error('Failed to update stripe_onboarding_complete:', updateError)
      }
    }

    return successResponse({ onboardingComplete: !!isComplete, details })
  } catch (err) {
    console.error('check-stripe-status error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(message, 500)
  }
})
