// Teacher-initiated course cancellation with bulk Dintero refunds.
//
// Idempotency: safe to re-run on an already-cancelled course. Each invocation
// re-scans every signup linked to a Dintero transaction and finishes whatever
// state transition is still needed (refund / void / no-op). That matters
// because the first call can fail mid-batch — e.g. a Dintero refund times out
// for one buyer — leaving the rest unprocessed. Re-running picks up where the
// previous call left off without double-refunding or stomping done rows.
//
// Per-signup routing is driven by the live Dintero transaction status, not
// our cached `payment_status`, so we correctly handle signups stuck in
// AUTHORIZED-but-not-CAPTURED (e.g. from an earlier capture failure) by
// voiding instead of attempting a refund on a non-captured authorization.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyAuth,
  verifyOrgMembership,
  handleCors,
  errorResponse,
  successResponse,
} from '../_shared/auth.ts'
import {
  getTransaction,
  refundTransaction,
  voidTransaction,
} from '../_shared/dintero.ts'
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

Deno.serve(async (req: Request) => {
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
    // Dintero side; we re-check those too.
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

    const refundPromises = (signups || []).map(async (signup) => {
      const participantName = signup.participant_name || ''
      const participantEmail = signup.participant_email || ''
      const transactionId = signup.dintero_transaction_id as string | null
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

      // Free or paymentless signup — just mark cancelled.
      if (!transactionId) {
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

      // Money already handled — fully refunded on a previous run, or partially
      // refunded earlier (partial refunds keep status='confirmed', so this row
      // can still be on its first cancellation pass). Make sure the row
      // reaches a terminal state either way; the remainder of a partial
      // refund stays a manual/backoffice decision — never auto-refund here.
      if (signup.refunded_at || signup.payment_status === 'refunded') {
        await supabase
          .from('signups')
          .update({
            status: 'course_cancelled',
            cancelled_at: signup.cancelled_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', signup.id)
        return { kind: 'already_handled', signup_id: signup.id, ...participant }
      }

      // Source of truth is the live Dintero transaction state, not our cached
      // payment_status. Handles AUTHORIZED-but-not-CAPTURED (capture failure
      // mid-flight) correctly — those need void, not refund.
      let txStatus: string
      try {
        const tx = await getTransaction(transactionId)
        txStatus = tx.status
      } catch (err) {
        return {
          kind: 'lookup_failed',
          signup_id: signup.id,
          participant_name: participantName,
          participant_email: participantEmail,
          error: err instanceof Error ? err.message : 'getTransaction failed',
        }
      }

      const amountOre = Math.round(Number(signup.amount_paid || 0) * 100)

      if (txStatus === 'CAPTURED' || txStatus === 'PARTIALLY_CAPTURED') {
        try {
          await refundTransaction(transactionId, amountOre, 'requested_by_customer')
          await supabase
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
          return {
            kind: 'refunded',
            signup_id: signup.id,
            amount: signup.amount_paid || 0,
            ...participant,
          }
        } catch (err) {
          return {
            kind: 'refund_failed',
            signup_id: signup.id,
            participant_name: participantName,
            participant_email: participantEmail,
            error: err instanceof Error ? err.message : 'Dintero refund failed',
          }
        }
      }

      if (txStatus === 'AUTHORIZED') {
        try {
          await voidTransaction(transactionId)
          await supabase
            .from('signups')
            .update({
              status: 'course_cancelled',
              cancelled_at: signup.cancelled_at ?? new Date().toISOString(),
              payment_status: 'voided',
              updated_at: new Date().toISOString(),
            })
            .eq('id', signup.id)
          return { kind: 'voided', signup_id: signup.id, ...participant }
        } catch (err) {
          return {
            kind: 'void_failed',
            signup_id: signup.id,
            participant_name: participantName,
            participant_email: participantEmail,
            error: err instanceof Error ? err.message : 'Dintero void failed',
          }
        }
      }

      // REFUNDED / AUTHORIZATION_VOIDED / FAILED / DECLINED — nothing to do at
      // Dintero. Just make sure the signup row is in a terminal state.
      await supabase
        .from('signups')
        .update({
          status: 'course_cancelled',
          cancelled_at: signup.cancelled_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', signup.id)
      return { kind: 'no_action_needed', signup_id: signup.id, ...participant }
    })

    const refundResults = await Promise.allSettled(refundPromises)
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
    // they have no Dintero transaction but still lose their course), with an
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
      const notifiable = refundResults
        .filter(
          (r): r is PromiseFulfilledResult<{
            kind: string
            signup_id: string
            amount?: number
            participant_name?: string
            participant_email?: string
            payment_status?: string | null
            was_confirmed?: boolean
          }> => r.status === 'fulfilled',
        )
        .map((r) => r.value)
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
})
