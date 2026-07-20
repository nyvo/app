// Plain-text owner alert emails, one per platform event. nb-NO, terse,
// sentence case — same tone as the app's transactional emails.
//
// Self-contained on purpose (no ../_shared imports) so the function can be
// deployed as a single unit outside the full-repo CI deploy; formatKroner
// mirrors _shared/format.ts.

export interface OwnerEventPayload {
  type?: string
  // booking
  course_title?: string
  seller_name?: string
  participant_name?: string
  ticket_label?: string
  amount_paid?: number | string | null
  payment_status?: string
  // new_seller
  name?: string
  operating_model?: string
  // new_seller + new_user
  email?: string
}

export interface OwnerAlertContent {
  subject: string
  text: string
}

/** Norwegian kroner formatter — mirror of _shared/format.formatKroner. */
function formatKroner(amount: number | null | undefined): string {
  return `${(amount ?? 0).toLocaleString('nb-NO')} kr`
}

/**
 * Build the subject + body for an owner alert, or null when the payload's
 * type is unknown (the caller 400s so a bad trigger payload is visible in
 * the function logs instead of sending an empty email).
 */
export function formatOwnerAlert(payload: OwnerEventPayload): OwnerAlertContent | null {
  switch (payload.type) {
    case 'booking': {
      const title = payload.course_title || 'ukjent kurs'
      const lines = [
        `Kurs: ${title}`,
        payload.seller_name ? `Arrangør: ${payload.seller_name}` : '',
        payload.participant_name ? `Deltaker: ${payload.participant_name}` : '',
        payload.ticket_label ? `Billett: ${payload.ticket_label}` : '',
        `Beløp: ${amountLine(payload)}`,
      ].filter(Boolean)
      return { subject: `Ny påmelding: ${title}`, text: lines.join('\n') }
    }
    case 'new_seller': {
      const name = payload.name || 'ukjent'
      const lines = [
        `Navn: ${name}`,
        payload.email ? `E-post: ${payload.email}` : '',
        payload.operating_model ? `Modell: ${payload.operating_model}` : '',
      ].filter(Boolean)
      return { subject: `Ny arrangør: ${name}`, text: lines.join('\n') }
    }
    case 'new_user':
      return {
        subject: 'Ny bruker registrert',
        text: `Ny konto registrert: ${payload.email || 'ukjent e-post'}`,
      }
    default:
      return null
  }
}

// One emoji per event type so the Slack feed scans at a glance.
const TYPE_EMOJI: Record<string, string> = {
  booking: '🎟️',
  new_seller: '✨',
  new_user: '👤',
}

/**
 * Slack mrkdwn message for an event: emoji + bold subject line, detail lines
 * under it. Null for unknown types, same contract as formatOwnerAlert.
 */
export function formatSlackMessage(payload: OwnerEventPayload): string | null {
  const content = formatOwnerAlert(payload)
  if (!content) return null
  const emoji = TYPE_EMOJI[payload.type ?? '']
  return `${emoji ? `${emoji} ` : ''}*${content.subject}*\n${content.text}`
}

function amountLine(payload: OwnerEventPayload): string {
  const amount = Number(payload.amount_paid ?? 0)
  if (!amount) return 'Gratis'
  const formatted = formatKroner(amount)
  // 'external' = the seller collects payment off-platform (manual adds,
  // free-tier studios) — the amount is the price, not money we've seen.
  return payload.payment_status === 'external' ? `${formatted} (ekstern betaling)` : formatted
}
