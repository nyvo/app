// Sends the post-booking "få oversikt" magic link for a guest checkout.
//
// The credential is possession of the Stripe payment_intent_id from the
// success URL query param. The function looks up the signup server-side
// and triggers Supabase's OTP email — the full address never crosses the
// anon API.
//
// No JWT (guest checkout); defense in depth: per-IP and per-PI rate limits,
// guests only (claimed signups have buyer_id), and the response never
// contains the email.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { handleCors, errorResponse, successResponse } from '../_shared/auth.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''

interface SendClaimLinkRequest {
  paymentIntentId: string
  // Validated by Supabase Auth against the project's redirect allowlist.
  redirectTo?: string
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const body: SendClaimLinkRequest = await req.json()
    const { paymentIntentId, redirectTo } = body

    if (!paymentIntentId) {
      return errorResponse('Missing required fields', 400, req)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Same fail-open pattern as create-free-signup: block only on explicit
    // `false` so a limiter hiccup never blocks a legitimate buyer.
    const clientIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
    const { data: ipAllowed, error: ipLimitErr } = await supabase.rpc('check_rate_limit', {
      p_key: `claim-link:ip:${clientIp}`, p_limit: 5, p_window_seconds: 3600,
    })
    if (ipLimitErr) console.error('check_rate_limit (ip) failed:', ipLimitErr)
    if (ipAllowed === false) {
      return errorResponse('For mange forsøk. Prøv igjen om litt.', 429, req)
    }
    const { data: piAllowed, error: piLimitErr } = await supabase.rpc('check_rate_limit', {
      p_key: `claim-link:pi:${paymentIntentId}`, p_limit: 3, p_window_seconds: 3600,
    })
    if (piLimitErr) console.error('check_rate_limit (pi) failed:', piLimitErr)
    if (piAllowed === false) {
      return errorResponse('For mange forsøk. Prøv igjen om litt.', 429, req)
    }

    const { data: signup, error: signupError } = await supabase
      .from('signups')
      .select('id, participant_email, payment_status, status, buyer_id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle()

    if (signupError) {
      console.error('send-booking-claim-link: signup lookup failed', signupError)
      return errorResponse('Noe gikk galt. Prøv igjen.', 500, req)
    }
    // One generic error for every reject: this endpoint must not act as an
    // oracle for which PI values exist or what state they are in.
    if (
      !signup ||
      signup.buyer_id !== null || // already claimed by an account
      signup.status !== 'confirmed' ||
      !['paid', 'external'].includes(signup.payment_status) ||
      !signup.participant_email ||
      signup.participant_email.endsWith('.invalid') // deletion tombstone
    ) {
      return errorResponse('Fant ikke påmeldingen.', 404, req)
    }

    // Anon client: signInWithOtp sends Supabase's standard magic-link email
    // (creates the account on first login — that is the point of the offer).
    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { error: otpError } = await authClient.auth.signInWithOtp({
      email: signup.participant_email,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    })
    if (otpError) {
      console.error('send-booking-claim-link: signInWithOtp failed', otpError)
      return errorResponse('Kunne ikke sende lenken. Prøv igjen.', 500, req)
    }

    return successResponse({ sent: true }, 200, req)
  } catch (err) {
    console.error('send-booking-claim-link error:', err)
    return errorResponse('Noe gikk galt. Prøv igjen.', 500, req)
  }
})
