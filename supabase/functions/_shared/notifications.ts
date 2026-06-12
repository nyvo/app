// Shared notification writer for Supabase Edge Functions.
//
// Single entry point: enqueueNotification(client, input). The input is a
// discriminated union per event type. Callers identify the studio (sellerId);
// recipients are resolved internally from seller_members (currently fan-out
// to owners only — extend the role filter for multi-recipient scenarios).
//
// All copy is Norwegian Bokmål, sentence case, formatKroner-formatted.
// Strings are snapshotted at insert time — never rendered dynamically from
// joins, because the underlying entity may be edited or deleted later.
//
// Idempotency: inserts use ON CONFLICT (dedupe_key) DO NOTHING so webhook
// retries, cron reruns, and edge-function retries cannot duplicate rows.
//
// Self-suppression: when `triggeredBy === recipientId` for a given fan-out
// recipient, that row is skipped — studio owners never get notifications
// for actions they performed themselves. Other recipients still receive.

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

// ---------- Norwegian currency formatter (Deno mirror of src/lib/utils.ts) ----------

function formatKroner(amount: number | null | undefined): string {
  return `${(amount ?? 0).toLocaleString('nb-NO')} kr`
}

// ---------- Event taxonomy ----------

export type NotificationInput =
  | {
      type: 'booking.created'
      sellerId: string
      actorId?: string | null
      signupId: string
      courseId: string
      buyerName: string
      courseTitle: string
      triggeredBy?: string | null
    }
  | {
      type: 'booking.waitlist_promoted'
      sellerId: string
      actorId?: string | null
      signupId: string
      courseId: string
      buyerName: string
      courseTitle: string
      triggeredBy?: string | null
    }
  | {
      type: 'payment.failed'
      sellerId: string
      actorId?: string | null
      signupId: string
      courseId: string
      transactionId: string
      buyerName: string
      amount: number
      triggeredBy?: string | null
    }
  | {
      type: 'refund.completed'
      sellerId: string
      actorId?: string | null
      signupId: string
      courseId: string
      refundId: string
      buyerName: string
      amount: number
      triggeredBy?: string | null
    }
  | {
      type: 'payout.sent'
      sellerId: string
      settlementId: string
      amount: number
      bankSuffix?: string | null
      triggeredBy?: string | null
    }
  | {
      type: 'dintero_seller.action_required'
      sellerId: string
      triggeredBy?: string | null
    }
  | {
      type: 'dintero_seller.approved'
      sellerId: string
      triggeredBy?: string | null
    }
  | {
      type: 'dintero_seller.rejected'
      sellerId: string
      triggeredBy?: string | null
    }
  | {
      type: 'team.invite_accepted'
      sellerId: string
      actorId: string
      teamMemberId: string
      memberName: string
      role: string
      triggeredBy?: string | null
    }

// ---------- Rendered row shape (recipient_id filled per fan-out) ----------

interface RenderedNotification {
  seller_id: string
  actor_id: string | null
  type: string
  action_required: boolean
  dedupe_key: string
  title: string
  body: string | null
  action_url: string
  metadata: Record<string, unknown>
}

// ---------- Render ----------

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function renderNotification(input: NotificationInput): RenderedNotification {
  const base = {
    seller_id: input.sellerId,
    actor_id: 'actorId' in input ? input.actorId ?? null : null,
  }

  switch (input.type) {
    case 'booking.created':
      return {
        ...base,
        type: input.type,
        action_required: false,
        dedupe_key: `booking.created:${input.signupId}`,
        title: 'Ny påmelding',
        body: `${input.buyerName} · ${input.courseTitle}`,
        action_url: `/courses/${input.courseId}`,
        metadata: { signup_id: input.signupId, course_id: input.courseId },
      }

    case 'booking.waitlist_promoted':
      return {
        ...base,
        type: input.type,
        action_required: false,
        dedupe_key: `booking.waitlist_promoted:${input.signupId}`,
        title: 'Ny påmelding fra venteliste',
        body: `${input.buyerName} · ${input.courseTitle}`,
        action_url: `/courses/${input.courseId}`,
        metadata: { signup_id: input.signupId, course_id: input.courseId },
      }

    case 'payment.failed':
      return {
        ...base,
        type: input.type,
        action_required: true,
        dedupe_key: `payment.failed:${input.transactionId}`,
        title: 'Betaling feilet',
        body: `${input.buyerName} · ${formatKroner(input.amount)}`,
        action_url: `/courses/${input.courseId}`,
        metadata: {
          signup_id: input.signupId,
          transaction_id: input.transactionId,
          amount: input.amount,
        },
      }

    case 'refund.completed':
      return {
        ...base,
        type: input.type,
        action_required: false,
        dedupe_key: `refund.completed:${input.refundId}`,
        title: 'Refusjon utbetalt',
        body: `${input.buyerName} · ${formatKroner(input.amount)}`,
        action_url: `/courses/${input.courseId}`,
        metadata: {
          signup_id: input.signupId,
          refund_id: input.refundId,
          amount: input.amount,
        },
      }

    case 'payout.sent':
      return {
        ...base,
        type: input.type,
        action_required: false,
        dedupe_key: `payout.sent:${input.settlementId}`,
        title: 'Utbetaling sendt',
        body: input.bankSuffix
          ? `${formatKroner(input.amount)} til ${input.bankSuffix}`
          : formatKroner(input.amount),
        action_url: '/settings/payouts',
        metadata: {
          settlement_id: input.settlementId,
          amount: input.amount,
          bank_suffix: input.bankSuffix ?? null,
        },
      }

    case 'dintero_seller.action_required':
      return {
        ...base,
        type: input.type,
        action_required: true,
        // Daily key — if still unresolved tomorrow, we re-surface as a fresh
        // row. Keeps the amber dot from staying stale for weeks.
        dedupe_key: `dintero_seller.action_required:${input.sellerId}:${todayKey()}`,
        title: 'Dintero trenger mer informasjon',
        body: 'Last opp manglende dokumenter',
        action_url: '/settings/payouts',
        metadata: { seller_id: input.sellerId },
      }

    case 'dintero_seller.approved':
      return {
        ...base,
        type: input.type,
        action_required: false,
        dedupe_key: `dintero_seller.approved:${input.sellerId}`,
        title: 'Dintero-kontoen er godkjent',
        body: 'Du kan nå motta betalinger',
        action_url: '/settings/payouts',
        metadata: { seller_id: input.sellerId },
      }

    case 'dintero_seller.rejected':
      return {
        ...base,
        type: input.type,
        action_required: true,
        dedupe_key: `dintero_seller.rejected:${input.sellerId}`,
        title: 'Dintero-kontoen ble avvist',
        body: 'Sjekk detaljer og prøv igjen',
        action_url: '/settings/payouts',
        metadata: { seller_id: input.sellerId },
      }

    case 'team.invite_accepted':
      return {
        ...base,
        type: input.type,
        action_required: false,
        dedupe_key: `team.invite_accepted:${input.teamMemberId}:${input.sellerId}`,
        title: 'Nytt teammedlem',
        body: `${input.memberName} · ${input.role}`,
        action_url: '/studio',
        metadata: {
          team_member_id: input.teamMemberId,
          role: input.role,
        },
      }
  }
}

// ---------- Recipient resolution ----------

// Studio owners and admins should know about studio events. Teachers don't
// (yet) — they don't act on bookings or payouts. Tweak the role filter here
// to extend fan-out later.
// seller_members is owner-only (CHECK since 20260606140000); kept as an
// array so a future role model only has to change this constant.
const NOTIFIABLE_ROLES = ['owner']

async function resolveRecipients(
  client: SupabaseClient,
  sellerId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from('seller_members')
    .select('user_id')
    .eq('seller_id', sellerId)
    .in('role', NOTIFIABLE_ROLES)

  if (error || !data) {
    console.error('[notifications] resolveRecipients failed', {
      sellerId,
      error: error?.message,
    })
    return []
  }

  return data.map((r) => r.user_id as string).filter(Boolean)
}

// ---------- Public API ----------

export async function enqueueNotification(
  client: SupabaseClient,
  input: NotificationInput,
): Promise<{ inserted: number; skipped: number }> {
  const row = renderNotification(input)
  const recipients = await resolveRecipients(client, input.sellerId)

  if (recipients.length === 0) {
    console.warn('[notifications] no recipients for seller', { sellerId: input.sellerId })
    return { inserted: 0, skipped: 0 }
  }

  let inserted = 0
  let skipped = 0

  for (const recipientId of recipients) {
    // Self-suppression: never notify a user about their own action.
    if (input.triggeredBy && input.triggeredBy === recipientId) {
      skipped++
      continue
    }

    const { error } = await client.from('notifications').upsert(
      { ...row, recipient_id: recipientId },
      { onConflict: 'recipient_id,dedupe_key', ignoreDuplicates: true },
    )

    if (error) {
      console.error('[notifications] insert failed', {
        type: input.type,
        dedupe_key: row.dedupe_key,
        recipient_id: recipientId,
        error: error.message,
      })
      skipped++
    } else {
      inserted++
    }
  }

  return { inserted, skipped }
}
