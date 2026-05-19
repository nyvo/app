// Buyer + seller side-effects fired after a paid signup. Called by both
// the webhook and finalize-dintero-transaction in their success paths
// (best-effort, fast UX), and again by the send-pending-confirmations
// cron as a retry safety net for any signup where the inline call failed
// (Resend hiccup, crash between INSERT and email, etc.).
//
// Idempotency:
//   * seller notification — dedupes via notifications.dedupe_key
//   * buyer email — gated by signups.confirmation_sent_at; we only send
//     when the column is NULL, and stamp it on success so subsequent
//     sweeps skip the row
//
// The whole function is best-effort by design: errors are swallowed so
// they never block the calling request. The sweep will pick up anything
// the inline call missed.

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { enqueueNotification } from './notifications.ts'
import { sendEmail } from './email.ts'
import { formatCourseStart, formatKroner, shortBookingId } from './format.ts'

type BookingAttempt = {
  seller_id: string
  course_id: string
  participant_name: string | null
  participant_email: string | null
}

export async function deliverBookingConfirmations(
  supabase: SupabaseClient,
  signupId: string,
  attempt: BookingAttempt,
  amountNok: number,
): Promise<void> {
  if (amountNok <= 0) return
  if (!attempt.participant_name) return

  await notifyBookingCreated(supabase, signupId, attempt, amountNok)
  await sendOrderConfirmEmail(supabase, signupId, attempt, amountNok)
}

async function notifyBookingCreated(
  supabase: SupabaseClient,
  signupId: string,
  attempt: BookingAttempt,
  amountNok: number,
): Promise<void> {
  if (amountNok <= 0) return
  if (!attempt.participant_name) return

  const { data: course } = await supabase
    .from('courses')
    .select('title')
    .eq('id', attempt.course_id)
    .maybeSingle()
  if (!course?.title) return

  await enqueueNotification(supabase, {
    type: 'booking.created',
    sellerId: attempt.seller_id,
    signupId,
    courseId: attempt.course_id,
    buyerName: attempt.participant_name,
    courseTitle: course.title,
  })
}

async function sendOrderConfirmEmail(
  supabase: SupabaseClient,
  signupId: string,
  attempt: BookingAttempt,
  amountNok: number,
): Promise<void> {
  if (!attempt.participant_email || !attempt.participant_name) return

  // Skip if already delivered. Cheap pre-flight read avoids re-sending
  // when the inline path already succeeded and the sweep picks the row
  // up before the next NULL-filtered sweep query refreshes.
  const { data: existing } = await supabase
    .from('signups')
    .select('confirmation_sent_at')
    .eq('id', signupId)
    .maybeSingle()
  if (existing?.confirmation_sent_at) return

  const [{ data: course }, { data: seller }] = await Promise.all([
    supabase
      .from('courses')
      .select('title, start_date, time_schedule, location')
      .eq('id', attempt.course_id)
      .maybeSingle(),
    supabase
      .from('sellers')
      .select('name')
      .eq('id', attempt.seller_id)
      .maybeSingle(),
  ])
  if (!course?.title || !seller?.name) return

  const result = await sendEmail({
    template: 'order-confirm',
    to: attempt.participant_email,
    props: {
      buyerName: attempt.participant_name,
      studioName: seller.name,
      courseTitle: course.title,
      courseStart: formatCourseStart(course.start_date, course.time_schedule),
      courseLocation: course.location ?? undefined,
      amount: formatKroner(amountNok),
      bookingId: shortBookingId(signupId),
    },
  })

  if (result.error) {
    console.error('[order-confirm email] send failed', {
      signupId,
      to: attempt.participant_email,
      error: result.error,
    })
    return
  }

  await supabase
    .from('signups')
    .update({ confirmation_sent_at: new Date().toISOString() })
    .eq('id', signupId)
}
