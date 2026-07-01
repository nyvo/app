// Create a Stripe (Connect) PaymentIntent for the embedded checkout flow.
// Stripe-side counterpart to create-dintero-session (Phase 2 of the Dintero → Stripe migration).
//
// Mirrors create-dintero-session's validation 1:1 (rate-limit, course/seller/ticket checks,
// duplicate guard, soft capacity check, payment_attempts insert). The only provider difference
// is the charge: instead of a Dintero session with two split line items, we create ONE
// destination-charge PaymentIntent (manual capture + on_behalf_of + transfer_data +
// application_fee_amount). See plan §2 / C1 / C4 / C7.
//
// Flow:
//   1. Validate course + seller + Stripe Connect onboarding status.
//   2. Validate the ticket type (active, in sales window, owned by course).
//   3. For drop-ins: validate the session exists for this course.
//   4. Block duplicate non-drop-in signups before charging.
//   5. Insert a payment_attempts row (its id = metadata.attempt_id, C4).
//   6. Create a manual-capture PaymentIntent; capture happens after the capacity check in
//      stripe-connect-webhook (payment_intent.amount_capturable_updated, C1).
//   7. Return { clientSecret, paymentIntentId, attemptId } so the client confirms via Elements.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { handleCors, errorResponse, successResponse } from '../_shared/auth.ts'
import { calculatePricing } from '../_shared/pricing.ts'
import { isCourseEnded } from '../_shared/course-status.ts'
import { createPaymentIntent } from '../_shared/stripe.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface SessionRequestBody {
  courseId: string
  /** Team slug from the public booking URL — looked up via teams.owner_seller_id. */
  organizationSlug: string
  ticketTypeId: string
  customerEmail: string
  customerName: string
  customerPhone?: string
  customerNote?: string
  /** Required only when the ticket's kind is 'drop_in'. */
  sessionId?: string
}

type TicketKind = 'package' | 'drop_in' | 'pass'
type TicketAudience = 'standard' | 'student' | 'senior' | 'staff'

interface TicketTypeRow {
  id: string
  course_id: string
  label: string
  description: string | null
  price: number
  weeks: number | null
  ticket_kind: TicketKind
  audience: TicketAudience
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = (await req.json()) as SessionRequestBody

    const {
      courseId,
      organizationSlug,
      ticketTypeId,
      customerEmail,
      customerName,
      customerPhone,
      customerNote,
      sessionId,
    } = body

    if (!courseId || !organizationSlug || !ticketTypeId || !customerEmail || !customerName) {
      return errorResponse('Missing required fields', 400, req)
    }

    // Validate UUID-shaped inputs before they flow into .eq() queries.
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(courseId)) {
      return errorResponse('Invalid courseId', 400, req)
    }
    if (!uuidRegex.test(ticketTypeId)) {
      return errorResponse('Invalid ticketTypeId', 400, req)
    }
    if (sessionId !== undefined && sessionId !== null && !uuidRegex.test(sessionId)) {
      return errorResponse('Invalid sessionId', 400, req)
    }

    // Length caps on user-provided strings.
    if (customerName.length > 200) {
      return errorResponse('customerName exceeds 200 characters', 400, req)
    }
    if (customerPhone && customerPhone.length > 30) {
      return errorResponse('customerPhone exceeds 30 characters', 400, req)
    }
    if (customerNote && customerNote.length > 1000) {
      return errorResponse('customerNote exceeds 1000 characters', 400, req)
    }
    if (!/^[a-z0-9-]{1,64}$/.test(organizationSlug)) {
      return errorResponse('Invalid organizationSlug', 400, req)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerEmail)) {
      return errorResponse('Invalid email format', 400, req)
    }

    // Abuse protection: per-IP + per-email fixed-window rate limit. Each call creates a
    // PaymentIntent and writes a payment_attempts row, so cap it. Check IP FIRST and return on
    // block. Fail open — only block on an explicit `false`.
    const clientIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
    const { data: ipAllowed, error: ipLimitErr } = await supabase.rpc('check_rate_limit', { p_key: `checkout:ip:${clientIp}`, p_limit: 20, p_window_seconds: 3600 })
    if (ipLimitErr) console.error('check_rate_limit (ip) failed:', ipLimitErr)
    if (ipAllowed === false) {
      return errorResponse('For mange forsøk. Prøv igjen om litt.', 429, req)
    }
    const emailKey = customerEmail.trim().toLowerCase()
    const { data: emailAllowed, error: emailLimitErr } = await supabase.rpc('check_rate_limit', { p_key: `checkout:email:${emailKey}`, p_limit: 10, p_window_seconds: 3600 })
    if (emailLimitErr) console.error('check_rate_limit (email) failed:', emailLimitErr)
    if (emailAllowed === false) {
      return errorResponse('For mange forsøk. Prøv igjen om litt.', 429, req)
    }

    // Load course + seller (slug lives on the seller's owning team).
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        id, title, status, max_participants, start_date, end_date,
        course_sessions(session_date, status),
        seller:sellers(
          id,
          name,
          stripe_account_id,
          stripe_onboarding_complete,
          subscription_plan,
          subscription_status,
          team:teams!owner_seller_id(slug)
        )
      `)
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return errorResponse('Course not found', 404, req)
    }

    const seller = course.seller as unknown as {
      id: string
      name: string
      stripe_account_id: string | null
      stripe_onboarding_complete: boolean
      subscription_plan: string | null
      subscription_status: string | null
      team: { slug: string } | null
    } | null

    if (!seller || seller.team?.slug !== organizationSlug) {
      return errorResponse('Course not found for this seller', 404, req)
    }

    if (course.status === 'draft' || course.status === 'cancelled') {
      return errorResponse('Course is not available for booking', 400, req)
    }

    // Reject checkout for a course whose last session is already in the past.
    if (
      isCourseEnded({
        status: course.status,
        startDate: course.start_date,
        endDate: course.end_date,
        sessions: course.course_sessions as { session_date: string; status: string | null }[] | null,
      })
    ) {
      return errorResponse('Dette kurset er avsluttet.', 400, req)
    }

    // Seller must have completed Stripe Connect onboarding (charges_enabled).
    if (!seller.stripe_account_id || !seller.stripe_onboarding_complete) {
      return errorResponse('Payment is not set up for this seller', 400, req)
    }
    // Capture into a non-null const here, where the guard above has narrowed the type. The
    // narrowing is otherwise lost across the many awaits before createPaymentIntent is called.
    const stripeAccountId: string = seller.stripe_account_id

    // Free-tier ("Start") sellers pay the platform take, deducted from their payout via the
    // application fee. Active (incl. past_due grace) Pro pays 0% — a lapsed Pro reverts to
    // the take rather than free-riding.
    const platformTake = !(
      seller.subscription_plan === 'pro' &&
      ['active', 'past_due'].includes(seller.subscription_status ?? '')
    )

    // Resolve the ticket type via available_ticket_types(courseId) — the same RPC the booking
    // page uses, so the buyer is charged exactly what they saw.
    const { data: availableTiers, error: tiersError } = await supabase.rpc(
      'available_ticket_types',
      { p_course_id: courseId },
    )
    if (tiersError) {
      return errorResponse('Kunne ikke hente billettyper', 500, req)
    }
    const typedTier = ((availableTiers ?? []) as TicketTypeRow[]).find(
      (t) => t.id === ticketTypeId,
    )
    if (!typedTier) {
      return errorResponse('Denne billetten er ikke tilgjengelig', 400, req)
    }

    if (typedTier.price <= 0) {
      return errorResponse('Course has no valid price', 400, req)
    }

    const isDropIn = typedTier.ticket_kind === 'drop_in'

    if (isDropIn && !sessionId) {
      return errorResponse('Drop-in krever at du velger en time', 400, req)
    }
    if (!isDropIn && sessionId) {
      return errorResponse('Pakke-billetter kan ikke knyttes til en enkelt time', 400, req)
    }

    // Duplicate-signup short-circuit (non-drop-in only): at most one active package signup per
    // (course, email); unlimited drop-ins.
    if (!isDropIn) {
      const normalizedEmail = customerEmail.trim().toLowerCase()
      const { data: existingSignup } = await supabase
        .from('signups')
        .select('id, ticket_kind_snapshot')
        .eq('course_id', courseId)
        .eq('status', 'confirmed')
        .ilike('participant_email', normalizedEmail)
      const existingPackage = (existingSignup ?? []).find(
        s => s.ticket_kind_snapshot !== 'drop_in',
      )
      if (existingPackage) {
        return errorResponse('Du er allerede påmeldt dette kurset.', 409, req)
      }
    }

    // Resolve the drop-in session up-front (capacity check + FK on payment_attempts).
    let courseSession: { id: string; session_date: string; start_time: string } | null = null
    if (isDropIn && sessionId) {
      const { data: cs, error: csError } = await supabase
        .from('course_sessions')
        .select('id, session_date, start_time, course_id, status')
        .eq('id', sessionId)
        .maybeSingle()
      if (csError || !cs) {
        return errorResponse('Timen finnes ikke', 404, req)
      }
      if ((cs as { course_id: string }).course_id !== courseId) {
        return errorResponse('Timen tilhører ikke dette kurset', 400, req)
      }
      if ((cs as { status: string | null }).status === 'cancelled') {
        return errorResponse('Timen er avlyst', 400, req)
      }
      courseSession = cs as { id: string; session_date: string; start_time: string }
    }

    // Soft capacity check. The hard guard is the advisory-locked RPC in the webhook — this just
    // avoids authorizing a card on a sale that can't succeed.
    if (isDropIn && courseSession && course.max_participants) {
      const { data: countResult } = await supabase.rpc('count_signups_for_session', {
        p_course_session_id: courseSession.id,
      })
      const sessionCount = typeof countResult === 'number' ? countResult : 0
      if (sessionCount >= course.max_participants) {
        return errorResponse('Timen er full', 400, req)
      }
    }

    const { serviceFeeNok, totalPrice, priceInOre, serviceFeeInOre, platformFeeInOre, platformFeeNok } =
      calculatePricing(typedTier.price, { platformTake })

    // Persist the attempt. Its id becomes metadata.attempt_id on the PaymentIntent (C4) and the
    // ticket-type snapshot fields are write-once context for refund/recovery paths.
    const { data: attempt, error: attemptError } = await supabase
      .from('payment_attempts')
      .insert({
        course_id: courseId,
        seller_id: seller.id,
        participant_name: customerName,
        participant_email: customerEmail,
        participant_phone: customerPhone ?? null,
        note: customerNote?.trim() || null,
        course_session_id: courseSession?.id ?? null,
        ticket_type_id: typedTier.id,
        ticket_label_snapshot: typedTier.label,
        ticket_audience_snapshot: typedTier.audience,
        ticket_kind_snapshot: typedTier.ticket_kind,
        base_price_nok: typedTier.price,
        service_fee_nok: serviceFeeNok,
        platform_fee_nok: platformFeeNok,
        total_price_nok: totalPrice,
        status: 'pending',
      })
      .select('id')
      .single()

    if (attemptError || !attempt) {
      return errorResponse('Failed to record payment attempt', 500, req)
    }

    const merchantReference = attempt.id

    // One destination charge: buyer pays the total; the connected (studio) account is the
    // merchant of record (on_behalf_of, C7) and receives the course price; the platform service
    // fee — plus the free-tier take — is pulled back via application_fee_amount. Manual capture
    // (C1) — captured in the webhook after the capacity check. Idempotency-keyed on the attempt id.
    let paymentIntent
    try {
      paymentIntent = await createPaymentIntent({
        amount: priceInOre,
        applicationFeeAmount: serviceFeeInOre + platformFeeInOre,
        sellerAccountId: stripeAccountId,
        attemptId: merchantReference,
      })
    } catch (piError) {
      console.error('createPaymentIntent failed for attempt', merchantReference, piError)
      // Void the orphaned attempt so it isn't swept as a live pending payment.
      await supabase
        .from('payment_attempts')
        .update({ status: 'voided' })
        .eq('id', merchantReference)
      return errorResponse('Kunne ikke starte betalingen. Prøv igjen.', 502, req)
    }

    // Backlink the PaymentIntent id for reconciliation + webhook lookup.
    const { error: backlinkError } = await supabase
      .from('payment_attempts')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', merchantReference)
    if (backlinkError) {
      // Non-fatal: the metadata.attempt_id round-trip still lets the webhook find this attempt.
      console.error('Failed to backlink stripe_payment_intent_id for attempt', merchantReference, backlinkError)
    }

    return successResponse(
      {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        attemptId: merchantReference,
      },
      200,
      req,
    )
  } catch (error) {
    console.error('create-stripe-connect-session error:', error)
    return errorResponse('Noe gikk galt. Prøv igjen.', 500, req)
  }
})
