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

interface LoginLinkRequest {
  organizationId: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { organizationId } = await req.json() as LoginLinkRequest

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

    if (!org.stripe_account_id) {
      return errorResponse('No Stripe account connected', 400)
    }

    if (!org.stripe_onboarding_complete) {
      return errorResponse('Stripe onboarding not complete', 400)
    }

    // Create login link for the Express Dashboard
    try {
      const loginLink = await stripe.accounts.createLoginLink(org.stripe_account_id)
      return successResponse({ url: loginLink.url })
    } catch (stripeErr: unknown) {
      // Account deleted/deauthorized — reset onboarding so teacher can reconnect
      const stripeError = stripeErr as { type?: string; code?: string; message?: string }
      if (stripeError.type === 'StripeInvalidRequestError') {
        console.warn('Stripe account invalid, resetting onboarding for org:', organizationId)
        await supabase
          .from('organizations')
          .update({ stripe_onboarding_complete: false, stripe_account_id: null })
          .eq('id', organizationId)
        return errorResponse('STRIPE_ACCOUNT_INVALID', 410)
      }
      throw stripeErr
    }
  } catch (err) {
    console.error('create-stripe-login-link error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(message, 500)
  }
})
