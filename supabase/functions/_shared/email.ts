// Shared email-send helper for Edge Functions.
//
// Internal callers (stripe-connect-webhook, cron jobs) use this to dispatch
// transactional emails via the send-email function. The frontend never calls send-email directly — user-triggered
// flows route through their own purpose-built function which validates
// the caller's authority, then forwards here.
//
// Add a new template:
//   1. Create supabase/functions/send-email/templates/<name>.tsx
//   2. Wire it in supabase/functions/send-email/index.ts (renderTemplate + defaultSubject)
//   3. Extend SendEmailInput below with the new template name + props type

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

export interface OrderConfirmEmailProps {
  buyerName: string
  studioName: string
  courseTitle: string
  /** Pre-formatted Norwegian date/time, e.g. "onsdag 28. mai kl. 18:00" */
  courseStart: string
  courseLocation?: string
  /** Pre-formatted via formatKroner, e.g. "1 200 kr". Omitted for manual
   * adds — payment settles off-platform, so there's no truthful amount. */
  amount?: string
  /** The teacher registered this participant manually — the intro says the
   * studio signed them up instead of thanking them for booking. */
  registeredByStudio?: boolean
  bookingId: string
  /** Pre-formatted via formatOrgNumber, e.g. "987 654 321". The arrangør's
   * legal identity anchor — the receipt is where it lives, not the UI. */
  arrangorOrgNumber?: string
  /** When set, the email's replyTo routes to the arrangør and the template
   * renders the "svar på denne e-posten" contact line. */
  arrangorEmail?: string
}

export interface RefundReceiptEmailProps {
  buyerName: string
  studioName: string
  courseTitle: string
  /** Pre-formatted via formatKroner, e.g. "1 200 kr" */
  amount: string
  /** Pre-formatted Norwegian date, e.g. "17. mai 2026" */
  refundDate: string
  bookingId: string
  /** Pre-formatted via formatOrgNumber, e.g. "987 654 321" */
  arrangorOrgNumber?: string
  /** When set, replyTo routes to the arrangør; renders the contact line. */
  arrangorEmail?: string
}

export interface ClassReminderEmailProps {
  buyerName: string
  studioName: string
  courseTitle: string
  courseStart: string
  courseLocation?: string
}

export interface CourseMessageEmailProps {
  buyerName: string
  studioName: string
  courseTitle: string
  subject: string
  body: string
}

export interface SessionRescheduledEmailProps {
  buyerName: string
  studioName: string
  courseTitle: string
  /** Pre-formatted Norwegian date, e.g. "onsdag 21. mai" */
  oldDate: string
  /** Pre-formatted time, e.g. "18:00" */
  oldTime: string
  newDate: string
  newTime: string
  courseLocation?: string
}

export interface BookingNotificationEmailProps {
  buyerName: string
  courseTitle: string
  /** Pre-formatted Norwegian date/time, e.g. "onsdag 28. mai kl. 18:00" */
  courseStart: string
  /** Pre-formatted via formatKroner, e.g. "1 200 kr" — or "Gratis" for free signups */
  amount: string
  bookingId: string
  buyerEmail?: string
}

export interface CourseCancelledEmailProps {
  buyerName: string
  studioName: string
  courseTitle: string
  /** Optional pre-formatted money line for this participant's situation. */
  refundNote?: string
  /** When set, replyTo routes to the arrangør; renders the contact line. */
  arrangorEmail?: string
}

export interface SignupCancelledEmailProps {
  buyerName: string
  studioName: string
  courseTitle: string
  /** Pre-formatted Norwegian date/time, e.g. "onsdag 28. mai kl. 18:00" */
  courseStart?: string
  /** Optional pre-formatted money line for this participant's situation. */
  paymentNote?: string
  /** When set, replyTo routes to the arrangør; renders the contact line. */
  arrangorEmail?: string
}

export interface SupportMessageEmailProps {
  userId: string
  senderName?: string
  senderEmail: string
  sellerId?: string
  sellerName?: string
  courseId?: string
  courseTitle?: string
  signupId?: string
  participantName?: string
  participantEmail?: string
  signupStatus?: string
  paymentStatus?: string
  supportSubject: string
  message: string
}

export type SendEmailInput =
  | { template: 'order-confirm'; to: string; props: OrderConfirmEmailProps; subject?: string; replyTo?: string }
  | { template: 'refund-receipt'; to: string; props: RefundReceiptEmailProps; subject?: string; replyTo?: string }
  | { template: 'class-reminder'; to: string; props: ClassReminderEmailProps; subject?: string; replyTo?: string }
  | { template: 'support-message'; to: string; props: SupportMessageEmailProps; subject?: string; replyTo?: string }
  | { template: 'session-rescheduled'; to: string; props: SessionRescheduledEmailProps; subject?: string; replyTo?: string }
  | { template: 'course-message'; to: string; props: CourseMessageEmailProps; subject?: string; replyTo?: string }
  | { template: 'booking-notification'; to: string; props: BookingNotificationEmailProps; subject?: string; replyTo?: string }
  | { template: 'course-cancelled'; to: string; props: CourseCancelledEmailProps; subject?: string; replyTo?: string }
  | { template: 'signup-cancelled'; to: string; props: SignupCancelledEmailProps; subject?: string; replyTo?: string }

export interface SendEmailResult {
  id?: string
  error?: string
}

/**
 * Dispatch a transactional email via the send-email Edge Function.
 *
 * Service-role only — must be called from another Edge Function with
 * SUPABASE_SERVICE_ROLE_KEY in env. Never call from the browser.
 *
 * Returns `{ id }` on success or `{ error }` on failure. Callers should
 * log failures but typically not retry (Resend handles transient retries
 * internally). For mission-critical sends, queue the request in a
 * database table and retry from a cron job.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!supabaseUrl || !serviceRoleKey) {
    return { error: 'Supabase env not configured' }
  }

  try {
    // Bound the call: without a timeout a hung Resend/edge connection stalls
    // the whole batch loop (reminders, confirmations, course messages) until the
    // isolate is wall-clock-killed, leaving the unsent tail unstamped and
    // re-sent next run. 15s mirrors the Stripe helper.
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      const err = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as { error?: string }
      return { error: err.error || `HTTP ${res.status}` }
    }

    const data = (await res.json()) as { id?: string }
    return { id: data.id }
  } catch (err) {
    return { error: (err as Error).message }
  }
}
