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
const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'

interface ConnectLinkRequest {
  organizationId: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { organizationId } = await req.json() as ConnectLinkRequest

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

    // If already onboarded, no need for a new link
    if (org.stripe_onboarding_complete) {
      return errorResponse('Stripe onboarding already complete', 400)
    }

    let accountId = org.stripe_account_id

    // Create Stripe Express account if needed
    if (!accountId) {
      console.log('Creating new Stripe Connect Express account for org:', organizationId)
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'NO',
        capabilities: {
          transfers: { requested: true },
        },
      })

      accountId = account.id

      // Save account ID to organization
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ stripe_account_id: accountId })
        .eq('id', organizationId)

      if (updateError) {
        console.error('Failed to save stripe_account_id:', updateError)
        return errorResponse('Failed to save Stripe account', 500)
      }

      console.log('Stripe account created:', accountId)
    }

    // Create Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      return_url: `${siteUrl}/teacher/stripe-callback?org=${organizationId}`,
      refresh_url: `${siteUrl}/teacher/stripe-callback?org=${organizationId}&refresh=true`,
      type: 'account_onboarding',
    })

    return successResponse({ url: accountLink.url })
  } catch (err) {
    console.error('create-stripe-connect-link error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(message, 500)
  }
})
