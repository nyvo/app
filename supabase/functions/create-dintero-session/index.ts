// Create a Dintero checkout session for the embedded payment flow.
//
// Ticket-type model (post-2026-04-26):
//   * Caller passes ticketTypeId, which must reference a row in
//     course_signup_packages owned by the same course. The tier carries
//     ticket_kind, audience, price, weeks, and sales-window data.
//   * For ticket_kind = 'drop_in', sessionId is required (the specific session
//     the buyer is purchasing). The session row is looked up server-side.
//   * For other kinds, sessionId is forbidden.
//   * Price is sourced from the tier row, never from courses.price /
//     courses.drop_in_price (the latter no longer exists).
//
// Flow:
//   1. Validate course + org + Dintero seller status.
//   2. Validate the ticket type (active, in sales window, owned by course).
//   3. For drop-ins: validate the session exists for this course.
//   4. Block duplicate non-drop-in signups before opening Dintero.
//   5. Insert a payment_attempts row that holds the full context, including
//      ticket_type_id + 3 write-once snapshots so refund/recovery paths have
//      ticket context even after the tier row is edited.
//   6. Create a Dintero session with auto_capture=false; capture happens after
//      the capacity check inside finalize-dintero-transaction or the webhook.
//   7. Return { sid, url, merchantReference } so the client can embed.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { handleCors, errorResponse, successResponse } from '../_shared/auth.ts'
import { calculatePricing } from '../_shared/pricing.ts'
import { isCourseEnded } from '../_shared/course-status.ts'
import {
  createSession,
  getProfileId,
  type DinteroSessionRequest,
} from '../_shared/dintero.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'

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

// Shape returned by the available_ticket_types(p_course_id) RPC — the
// authoritative buyable view. Drop-in price is the explicit tier price.
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

    // Abuse protection: per-IP + per-email fixed-window rate limit. Each call
    // opens a Dintero checkout session and writes a payment_attempts row, so cap
    // it to stop session spam. Check IP FIRST and return on block, so a
    // rate-limited IP can't keep incrementing / creating arbitrary email
    // buckets. Fail open — only block on an explicit `false`.
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

    // Load course + seller. The slug now lives on the seller's owning team
    // (teams.owner_seller_id), not on the seller itself — pull it through the
    // nested team relation.
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        id, title, status, max_participants, start_date, end_date,
        course_sessions(session_date, status),
        seller:sellers(
          id,
          name,
          dintero_seller_id,
          dintero_onboarding_complete,
          team:teams!owner_seller_id(slug)
        )
      `)
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return errorResponse('Course not found', 404, req)
    }

    const seller = course.seller as {
      id: string
      name: string
      dintero_seller_id: string | null
      dintero_onboarding_complete: boolean
      team: { slug: string } | null
    } | null

    if (!seller || seller.team?.slug !== organizationSlug) {
      return errorResponse('Course not found for this seller', 404, req)
    }

    if (course.status === 'draft' || course.status === 'cancelled') {
      return errorResponse('Course is not available for booking', 400, req)
    }

    // Reject checkout for a course whose last session is already in the past.
    // Persisted status stays `upcoming` forever, so this date gate is the only
    // thing stopping a finished course from being booked.
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

    if (!seller.dintero_seller_id || !seller.dintero_onboarding_complete) {
      return errorResponse('Payment is not set up for this seller', 400, req)
    }

    // Resolve the ticket type via available_ticket_types(courseId). The RPC is
    // the single source of truth used by the booking page — it applies the
    // is_active filter, sales-window check, and returns the explicit drop-in
    // tier price set by the teacher.
    // Going through the same function here guarantees the buyer is charged
    // exactly what they saw. If the tier isn't in the returned set, it's not
    // currently buyable for any reason (inactive, out of window, drop-in for a
    // non-series course, etc.) — we don't try to enumerate the reasons.
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

    // sessionId presence must match ticket kind. Reject early — the RPC will
    // reject too, but we'd rather not spin up a Dintero session in that case.
    if (isDropIn && !sessionId) {
      return errorResponse('Drop-in krever at du velger en time', 400, req)
    }
    if (!isDropIn && sessionId) {
      return errorResponse('Pakke-billetter kan ikke knyttes til en enkelt time', 400, req)
    }

    // Duplicate-signup short-circuit. Drop-ins are exempt: each drop-in is a
    // fresh class signup, and the unique index is on (course_id, email) only
    // for non-drop-in confirmed signups (well, for all confirmed signups —
    // we re-check carefully here). With ticket types, the right semantic is:
    // for the same (course, email), a customer can have at most one active
    // package signup but unlimited drop-ins.
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

    // Resolve drop-in session up-front. We need its date/time for the soft
    // capacity check and the order item description, and the FK on payment_attempts.
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

    // Soft capacity check. The hard guard is the advisory-locked RPC at finalize
    // time — this is just to avoid wasting a Dintero auth on a sale that
    // can't possibly succeed. For drop-ins we check the chosen session;
    // for packages we'd need to scan all sessions in window, which is expensive,
    // so we trust the RPC and skip the soft check.
    if (isDropIn && courseSession && course.max_participants) {
      const { data: countResult } = await supabase.rpc('count_signups_for_session', {
        p_course_session_id: courseSession.id,
      })
      const sessionCount = typeof countResult === 'number' ? countResult : 0
      if (sessionCount >= course.max_participants) {
        return errorResponse('Timen er full', 400, req)
      }
    }

    const { serviceFeeNok, totalPrice, priceInOre, basePriceInOre, serviceFeeInOre, platformFee } =
      calculatePricing(typedTier.price)

    // Persist the attempt. Its id becomes merchant_reference on the Dintero
    // session, and the ticket-type snapshot fields are write-once context for
    // refund/recovery paths.
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
        total_price_nok: totalPrice,
        status: 'pending',
      })
      .select('id')
      .single()

    if (attemptError || !attempt) {
      return errorResponse('Failed to record payment attempt', 500, req)
    }

    const merchantReference = attempt.id

    // Description shown on Dintero's order item line. Mirrors what the buyer
    // saw on the booking page — the tier label is the source of truth.
    const description = isDropIn
      ? `Drop-in: ${course.title} – ${typedTier.label}`
      : `${course.title} – ${typedTier.label}`

    // Two-line breakdown so the student sees the service fee as a distinct
    // item at checkout (transparency + aligns with Norwegian consumer
    // disclosure norms).
    //
    //  Line 1 — Course: base price, split 95% teacher / 5% platform.
    //  Line 2 — Servicegebyr: 5% of base added on top, 100% platform.
    const platformShareOnCourse = platformFee - serviceFeeInOre
    const teacherShareOnCourse = basePriceInOre - platformShareOnCourse

    const orderItems = [
      {
        id: courseId,
        line_id: '1',
        description,
        quantity: 1,
        amount: basePriceInOre,
        splits: [
          { payout_destination_id: seller.dintero_seller_id, amount: teacherShareOnCourse },
          { payout_destination_id: 'platform', amount: platformShareOnCourse },
        ],
      },
    ]

    if (serviceFeeInOre > 0) {
      orderItems.push({
        id: 'service-fee',
        line_id: '2',
        description: 'Servicegebyr',
        quantity: 1,
        amount: serviceFeeInOre,
        splits: [
          { payout_destination_id: 'platform', amount: serviceFeeInOre },
        ],
      })
    }

    const sessionRequest: DinteroSessionRequest = {
      url: {
        return_url: `${siteUrl}/checkout/success?transaction_id={{transaction_id}}&ref=${merchantReference}&org=${seller.team?.slug ?? ''}`,
        callback_url: `${supabaseUrl}/functions/v1/dintero-webhook`,
      },
      order: {
        amount: priceInOre,
        currency: 'NOK',
        merchant_reference: merchantReference,
        items: orderItems,
      },
      configuration: {
        auto_capture: false,
      },
      profile_id: getProfileId(),
    }

    const session = await createSession(sessionRequest)

    // Backlink the Dintero session id to the attempt for later reconciliation.
    const { error: backlinkError } = await supabase
      .from('payment_attempts')
      .update({ dintero_session_id: session.id })
      .eq('id', merchantReference)
    if (backlinkError) {
      // Non-fatal: the Dintero session is already live and the buyer can pay.
      // The attempt stays pending without a session id, but delete_course_cascade
      // and the courses retention trigger treat any non-failed/voided attempt as
      // material, so the course can't be deleted out from under this checkout.
      console.error('Failed to backlink dintero_session_id for attempt', merchantReference, backlinkError)
    }

    return successResponse(
      {
        sid: session.id,
        url: session.url,
        merchantReference,
      },
      200,
      req,
    )
  } catch (error) {
    console.error('create-dintero-session error:', error)
    return errorResponse('Noe gikk galt. Prøv igjen.', 500, req)
  }
})
