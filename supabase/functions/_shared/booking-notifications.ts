// Buyer + seller side-effects fired after a paid signup. Called by both
// the webhook and finalize-dintero-transaction in their success paths
// (best-effort, fast UX), and again by the send-pending-confirmations
// cron as a retry safety net for any signup where the inline call failed
// (Resend hiccup, crash between INSERT and email, etc.).
//
// Idempotency:
//   * seller in-app notification — dedupes via notifications.dedupe_key
//   * buyer email — gated by signups.confirmation_sent_at; we only send
//     when the column is NULL, and stamp it on success so subsequent
//     sweeps skip the row
//   * seller email — gated by signups.seller_notified_at, same pattern as
//     the buyer email but on its own column so the two retry independently
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
  // Free signups (amountNok === 0) still get a confirmation — a free trial
  // class is a real booking the buyer + studio want to know about.
  if (!attempt.participant_name) return

  await notifyBookingCreated(supabase, signupId, attempt, amountNok)
  await sendSellerBookingEmail(supabase, signupId, attempt, amountNok)
  await sendOrderConfirmEmail(supabase, signupId, attempt, amountNok)
}

async function notifyBookingCreated(
  supabase: SupabaseClient,
  signupId: string,
  attempt: BookingAttempt,
  amountNok: number,
): Promise<void> {
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

// Emails the studio owner(s) that a new participant signed up. Recipients are
// resolved from seller_members (role 'owner' — the single studio role since the
// 2026-06-06 owner-only collapse) via their profile email. Gated by
// signups.seller_notified_at so the inline call + sweep retries send exactly once.
async function sendSellerBookingEmail(
  supabase: SupabaseClient,
  signupId: string,
  attempt: BookingAttempt,
  amountNok: number,
): Promise<void> {
  if (!attempt.participant_name) return

  const { data: existing } = await supabase
    .from('signups')
    .select('seller_notified_at')
    .eq('id', signupId)
    .maybeSingle()
  if (existing?.seller_notified_at) return

  const [{ data: course }, { data: owners }] = await Promise.all([
    supabase
      .from('courses')
      .select('title, start_date, time_schedule')
      .eq('id', attempt.course_id)
      .maybeSingle(),
    supabase
      .from('seller_members')
      .select('profile:profiles(email)')
      .eq('seller_id', attempt.seller_id)
      .eq('role', 'owner'),
  ])
  if (!course?.title) return

  const recipients = (owners ?? [])
    .map((m) => {
      // PostgREST types the embed as an array though the user_id→profiles FK
      // is to-one; normalize to the single related row at runtime.
      const profile = m.profile as { email: string | null } | { email: string | null }[] | null
      const row = Array.isArray(profile) ? profile[0] : profile
      return row?.email ?? null
    })
    .filter((email): email is string => Boolean(email))
  if (recipients.length === 0) {
    console.warn('[seller booking email] no owner email for seller', {
      sellerId: attempt.seller_id,
      signupId,
    })
    return
  }

  let anySent = false
  for (const to of recipients) {
    const result = await sendEmail({
      template: 'booking-notification',
      to,
      props: {
        buyerName: attempt.participant_name,
        courseTitle: course.title,
        courseStart: formatCourseStart(course.start_date, course.time_schedule),
        amount: amountNok > 0 ? formatKroner(amountNok) : 'Gratis',
        bookingId: shortBookingId(signupId),
        buyerEmail: attempt.participant_email ?? undefined,
      },
    })

    if (result.error) {
      console.error('[seller booking email] send failed', { signupId, to, error: result.error })
    } else {
      anySent = true
    }
  }

  // Stamp once at least one owner was reached. Single-owner studios are the
  // norm post-collapse, so this is "sent" in practice; a partial multi-owner
  // failure is logged above and accepted rather than re-sending to everyone.
  if (anySent) {
    await supabase
      .from('signups')
      .update({ seller_notified_at: new Date().toISOString() })
      .eq('id', signupId)
  }
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
      amount: amountNok > 0 ? formatKroner(amountNok) : 'Gratis',
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
