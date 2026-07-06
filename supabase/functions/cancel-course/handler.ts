// Teacher-initiated course cancellation with bulk Stripe refunds.
//
// Idempotency: safe to re-run on an already-cancelled course. Each invocation
// re-scans every signup and finishes whatever state transition is still needed
// (refund / void / no-op). That matters because the first call can fail
// mid-batch — e.g. a Stripe refund times out for one buyer — leaving the rest
// unprocessed. Re-running picks up where the previous call left off without
// double-refunding or stomping done rows.
//
// Per-signup routing is driven by the live Stripe PaymentIntent status, not
// our cached `payment_status`, so we correctly handle signups stuck in
// requires_capture (e.g. from an earlier capture failure) by cancelling instead
// of attempting a refund on an uncaptured authorization. Non-Stripe signups
// (free or manually marked paid) are cancelled without a refund attempt.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyAuth,
  verifyOrgMembership,
  handleCors,
  errorResponse,
  successResponse,
} from '../_shared/auth.ts'
import {
  retrievePaymentIntent,
  retrieveCharge,
  refundPaymentIntent,
  cancelPaymentIntent,
} from '../_shared/stripe.ts'
import { sendEmail } from '../_shared/email.ts'
import { formatKroner } from '../_shared/format.ts'
import { resolveArrangorIdentity } from '../_shared/booking-notifications.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

interface CancelCourseRequest {
  course_id: string
  reason?: string
  notify_participants?: boolean
}

interface FailedRefundDetail {
  signup_id: string
  participant_name: string
  participant_email: string
  error: string
}

interface CancellationResult {
  success: boolean
  refunds_processed: number
  refunds_failed: number
  voids_processed: number
  notifications_sent: number
  failed_refund_details: FailedRefundDetail[]
  total_refunded: number
  already_handled: number
  message: string
}

// Exported for direct invocation in tests (index.ts wires it to Deno.serve).
export async function handleCancelCourse(req: Request): Promise<Response> {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const authResult = await verifyAuth(req)
    if (!authResult.authenticated) {
      return errorResponse(authResult.error || 'Unauthorized', 401, req)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = (await req.json()) as CancelCourseRequest

    if (!body.course_id) {
      return errorResponse('Missing course_id', 400, req)
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, seller_id, status')
      .eq('id', body.course_id)
      .single()

    if (courseError || !course) {
      return errorResponse('Course not found', 404, req)
    }

    // seller_members.role is the single studio owner/operator role — always 'owner'
    // ('admin' is a legacy enum value, blocked by a DB CHECK; no 'teacher' role).
    // The 'admin' entry below is retained harmlessly as legacy.
    const authzResult = await verifyOrgMembership(authResult.userId!, course.seller_id, [
      'owner',
      'admin',
    ])
    if (!authzResult.authorized) {
      return errorResponse('You do not have permission to cancel this course', 403, req)
    }

    // Set the cancelled flag (idempotent — re-write is a no-op). Done BEFORE
    // refunds so no new signups can slip in during processing.
    if (course.status !== 'cancelled') {
      const { error: updateError } = await supabase
        .from('courses')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', body.course_id)

      if (updateError) {
        return errorResponse('Failed to cancel course', 500, req)
      }
    }

    // Pull every signup tied to this course in a state that may still need
    // money handling. `confirmed` = first cancel pass. `course_cancelled` =
    // a previous pass already flipped status but possibly failed on the
    // payment side; we re-check those too.
    const { data: signups, error: signupsError } = await supabase
      .from('signups')
      .select('*')
      .eq('course_id', body.course_id)
      .in('status', ['confirmed', 'course_cancelled'])

    if (signupsError) {
      return errorResponse('Failed to fetch signups', 500, req)
    }

    const results: CancellationResult = {
      success: true,
      refunds_processed: 0,
      refunds_failed: 0,
      voids_processed: 0,
      notifications_sent: 0,
      failed_refund_details: [],
      total_refunded: 0,
      already_handled: 0,
      message: '',
    }

    const runOne = async (signup: NonNullable<typeof signups>[number]) => {
      const participantName = signup.participant_name || ''
      const participantEmail = signup.participant_email || ''
      const stripePaymentIntentId = signup.stripe_payment_intent_id as string | null
      // Email eligibility: only signups that transition out of 'confirmed' in
      // THIS run get notified, so re-running the (idempotent) cancellation
      // never re-sends. Rows already 'course_cancelled' from a previous pass
      // were either notified then or belong to a pre-notification cancel.
      const participant = {
        participant_name: participantName,
        participant_email: participantEmail,
        payment_status: (signup.payment_status as string | null) ?? null,
        was_confirmed: signup.status === 'confirmed',
      }

      // Money already handled — fully refunded on a previous run, or partially
      // refunded earlier (partial refunds keep status='confirmed', so this row
      // can still be on its first cancellation pass). Make sure the row reaches
      // a terminal state either way. Checked first so it applies to both providers.
      // A PARTIAL prior refund (0 < refund_amount < amount_paid) is NOT made-whole by
      // cancelling the course: terminalize the row but surface it for a manual remainder
      // refund (Option A — no partial-refund automation), rather than silently counting it
      // as already handled.
      const amountPaidNum = Number(signup.amount_paid || 0)
      const refundAmtNum = Number(signup.refund_amount || 0)
      const isPartialPriorRefund =
        refundAmtNum > 0 && amountPaidNum > 0 && refundAmtNum < amountPaidNum
      if (signup.refunded_at || signup.payment_status === 'refunded') {
        await supabase
          .from('signups')
          .update({
            status: 'course_cancelled',
            cancelled_at: signup.cancelled_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', signup.id)
        if (isPartialPriorRefund) {
          return {
            kind: 'refund_failed',
            signup_id: signup.id,
            participant_name: participantName,
            participant_email: participantEmail,
            error: `Delrefusjon allerede utført (${formatKroner(refundAmtNum)} av ${formatKroner(amountPaidNum)}). Restbeløpet må refunderes manuelt.`,
          }
        }
        return { kind: 'already_handled', signup_id: signup.id, ...participant }
      }

      // Stripe-paid signup — route on the live PaymentIntent status: succeeded => full refund
      // (reverse transfer + application fee, C6);
      // requires_capture => cancel the uncaptured auth; anything else => terminal no-op.
      if (stripePaymentIntentId) {
        let piStatus: string
        let latestChargeId: string | null = null
        try {
          const pi = await retrievePaymentIntent(stripePaymentIntentId)
          piStatus = pi.status
          latestChargeId = pi.latest_charge ?? null
        } catch (err) {
          return {
            kind: 'lookup_failed',
            signup_id: signup.id,
            participant_name: participantName,
            participant_email: participantEmail,
            error: err instanceof Error ? err.message : 'retrievePaymentIntent failed',
          }
        }

        if (piStatus === 'succeeded') {
          // Reconcile against the live charge before refunding. The already-handled guard above
          // only catches refunds we recorded in the DB; a refund that moved at Stripe but whose
          // DB write failed is invisible there and would be re-issued here (Stripe then rejects it
          // → false failure). A fully-refunded charge => idempotent success (reconcile, don't
          // re-refund); a partial one => surface for a manual remainder (Option A).
          let alreadyRefunded = false
          if (latestChargeId) {
            try {
              const charge = await retrieveCharge(latestChargeId)
              if (charge.amount_refunded >= charge.amount) {
                alreadyRefunded = true
              } else if (charge.amount_refunded > 0) {
                return {
                  kind: 'refund_failed',
                  signup_id: signup.id,
                  participant_name: participantName,
                  participant_email: participantEmail,
                  error: 'Delrefusjon allerede utført hos Stripe. Restbeløpet må refunderes manuelt.',
                }
              }
            } catch (_e) { /* charge lookup failed — fall through and attempt the refund */ }
          }
          try {
            if (!alreadyRefunded) {
              await refundPaymentIntent({
                paymentIntentId: stripePaymentIntentId,
                reverseTransfer: true,
                refundApplicationFee: true,
              })
            }
            const { error: updErr } = await supabase
              .from('signups')
              .update({
                status: 'course_cancelled',
                cancelled_at: signup.cancelled_at ?? new Date().toISOString(),
                payment_status: 'refunded',
                refund_amount: signup.amount_paid || 0,
                refunded_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', signup.id)
            if (updErr) {
              // Money was returned but the row write failed — never count this as a clean refund.
              return {
                kind: 'refund_failed',
                signup_id: signup.id,
                participant_name: participantName,
                participant_email: participantEmail,
                error: `Refusjon utført, men databaseoppdatering feilet (${updErr.message}). Krever manuell avstemming.`,
              }
            }
            return { kind: 'refunded', signup_id: signup.id, amount: signup.amount_paid || 0, ...participant }
          } catch (err) {
            return {
              kind: 'refund_failed',
              signup_id: signup.id,
              participant_name: participantName,
              participant_email: participantEmail,
              error: err instanceof Error ? err.message : 'Stripe refund failed',
            }
          }
        }

        if (piStatus === 'requires_capture') {
          try {
            await cancelPaymentIntent(stripePaymentIntentId)
            const { error: updErr } = await supabase
              .from('signups')
              .update({
                status: 'course_cancelled',
                cancelled_at: signup.cancelled_at ?? new Date().toISOString(),
                payment_status: 'failed',
                updated_at: new Date().toISOString(),
              })
              .eq('id', signup.id)
            if (updErr) {
              return {
                kind: 'void_failed',
                signup_id: signup.id,
                participant_name: participantName,
                participant_email: participantEmail,
                error: `Reservasjon annullert, men databaseoppdatering feilet (${updErr.message}). Krever manuell avstemming.`,
              }
            }
            return { kind: 'voided', signup_id: signup.id, ...participant }
          } catch (err) {
            return {
              kind: 'void_failed',
              signup_id: signup.id,
              participant_name: participantName,
              participant_email: participantEmail,
              error: err instanceof Error ? err.message : 'Stripe cancel failed',
            }
          }
        }

        // Settlement in flight: refunding isn't possible yet, and terminalizing
        // now would strand the buyer paid-for-a-cancelled-course once it
        // settles. Leave the row 'confirmed' and surface it so a re-run refunds
        // it once the PI reaches 'succeeded' (mirrors lookup_failed).
        if (piStatus === 'processing') {
          return {
            kind: 'refund_failed',
            signup_id: signup.id,
            participant_name: participantName,
            participant_email: participantEmail,
            error: 'Betalingen er under oppgjør. Kjør avlysningen på nytt om litt for å refundere.',
          }
        }

        // canceled / already refunded at Stripe — no money moved; terminalize.
        await supabase
          .from('signups')
          .update({
            status: 'course_cancelled',
            cancelled_at: signup.cancelled_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', signup.id)
        return { kind: 'no_action_needed', signup_id: signup.id, ...participant }
      }

      // Non-Stripe signup — free or manually marked paid — so no refund is
      // attempted; just mark the row cancelled.
      await supabase
        .from('signups')
        .update({
          status: 'course_cancelled',
          cancelled_at: signup.cancelled_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', signup.id)
      return { kind: 'no_payment', signup_id: signup.id, ...participant }
    }

    // Bound Stripe concurrency: a course with hundreds of signups otherwise
    // fires hundreds of parallel retrieve/refund calls and trips Stripe's rate
    // limiter (429s surface as refund_failed noise). Process in small batches;
    // failed rows stay 'confirmed' and are retried on the next cancel run.
    const REFUND_CONCURRENCY = 8
    const allSignups = signups || []
    const refundResults: PromiseSettledResult<Awaited<ReturnType<typeof runOne>>>[] = []
    for (let i = 0; i < allSignups.length; i += REFUND_CONCURRENCY) {
      const batch = allSignups.slice(i, i + REFUND_CONCURRENCY).map((s) => runOne(s))
      refundResults.push(...(await Promise.allSettled(batch)))
    }
    for (const r of refundResults) {
      if (r.status !== 'fulfilled') {
        results.refunds_failed++
        results.failed_refund_details.push({
          signup_id: 'unknown',
          participant_name: 'unknown',
          participant_email: 'unknown',
          error: r.reason instanceof Error ? r.reason.message : 'Promise rejected',
        })
        continue
      }

      const v = r.value
      switch (v.kind) {
        case 'refunded':
          results.refunds_processed++
          results.total_refunded += (v as { amount: number }).amount
          break
        case 'voided':
          results.voids_processed++
          break
        case 'already_handled':
          results.already_handled++
          break
        case 'refund_failed':
        case 'void_failed':
        case 'lookup_failed': {
          results.refunds_failed++
          const f = v as {
            signup_id: string
            participant_name: string
            participant_email: string
            error: string
          }
          results.failed_refund_details.push({
            signup_id: f.signup_id,
            participant_name: f.participant_name,
            participant_email: f.participant_email,
            error: f.error,
          })
          break
        }
        // no_payment / no_action_needed — nothing to count
      }
    }

    // Notify participants — best-effort, after money handling (the email's
    // refund note must describe what actually happened). Eligible: signups
    // that transitioned out of 'confirmed' in this run (incl. free/manual —
    // they have no captured payment but still lose their course), with an
    // email on file. Failed refunds/voids/lookups are NOT emailed this run:
    // their rows stay 'confirmed', so the re-run that completes the money
    // handling sends their (single) email with the correct refund note.
    // 'already_handled' rows that were still confirmed (partially refunded
    // earlier) get the email with no money line — their refund receipt
    // already arrived separately.
    if (body.notify_participants !== false) {
      type NotifiableKind =
        | 'no_payment'
        | 'refunded'
        | 'voided'
        | 'no_action_needed'
        | 'already_handled'
      const notifiableKinds: NotifiableKind[] = [
        'no_payment',
        'refunded',
        'voided',
        'no_action_needed',
        'already_handled',
      ]
      interface NotifiableValue {
        kind: string
        signup_id: string
        amount?: number
        participant_name?: string
        participant_email?: string
        payment_status?: string | null
        was_confirmed?: boolean
      }
      const notifiable = refundResults
        .flatMap((r): NotifiableValue[] =>
          r.status === 'fulfilled' ? [r.value as NotifiableValue] : [],
        )
        .filter((v) =>
          (notifiableKinds as string[]).includes(v.kind) &&
          v.was_confirmed === true &&
          !!v.participant_email,
        )

      if (notifiable.length > 0) {
        const arrangor = await resolveArrangorIdentity(supabase, course.seller_id)
        if (arrangor) {
          // Sequential — keeps Resend rate-limit happy on long lists.
          for (const v of notifiable) {
            const to = v.participant_email
            if (!to) continue
            const kind = v.kind as NotifiableKind
            const refundNote =
              kind === 'refunded'
                ? `Du får ${formatKroner(v.amount || 0)} tilbake til kortet du betalte med. Kvitteringen kommer i en egen e-post.`
                : kind === 'voided'
                  ? 'Reservasjonen på kortet ditt er annullert — du er ikke belastet.'
                  : kind !== 'already_handled' && v.payment_status === 'external'
                    ? `Har du betalt direkte til ${arrangor.name}, ta kontakt med dem om tilbakebetaling.`
                    : undefined
            const sendResult = await sendEmail({
              template: 'course-cancelled',
              to,
              // Buyer replies go to the arrangør — the seller of record.
              replyTo: arrangor.contactEmail ?? undefined,
              props: {
                buyerName: v.participant_name || '',
                studioName: arrangor.name,
                courseTitle: course.title,
                refundNote,
                arrangorEmail: arrangor.contactEmail ?? undefined,
              },
            })
            if (sendResult.error) {
              console.error('[cancel-course] participant email failed', {
                signupId: v.signup_id,
                error: sendResult.error,
              })
            } else {
              results.notifications_sent++
            }
          }
        } else {
          console.error('[cancel-course] could not resolve arrangør identity — no participant emails sent', {
            sellerId: course.seller_id,
          })
        }
      }
    }

    if (results.refunds_failed > 0) {
      results.success = false
      results.message =
        `Kurset er avlyst. ${results.refunds_processed} refusjoner behandlet, ` +
        `${results.refunds_failed} feilet og krever manuell oppfølging.`
    } else {
      results.message = `Kurset er avlyst. ${results.refunds_processed} refusjoner behandlet.`
    }

    return successResponse(results, 200, req)
  } catch (error) {
    console.error('cancel-course error:', error)
    return errorResponse('Noe gikk galt. Prøv igjen.', 500, req)
  }
}
