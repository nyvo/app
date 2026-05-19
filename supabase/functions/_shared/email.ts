// Shared email-send helper for Edge Functions.
//
// Internal callers (dintero-webhook, finalize-dintero-transaction, cron
// jobs) use this to dispatch transactional emails via the send-email
// function. The frontend never calls send-email directly — user-triggered
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
  /** Pre-formatted via formatKroner, e.g. "1 200 kr" */
  amount: string
  bookingId: string
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
}

export interface ClassReminderEmailProps {
  buyerName: string
  studioName: string
  courseTitle: string
  courseStart: string
  courseLocation?: string
}

export type SendEmailInput =
  | { template: 'order-confirm'; to: string; props: OrderConfirmEmailProps; subject?: string }
  | { template: 'refund-receipt'; to: string; props: RefundReceiptEmailProps; subject?: string }
  | { template: 'class-reminder'; to: string; props: ClassReminderEmailProps; subject?: string }

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
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(input),
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
