// Trigger-driven owner alert: AFTER INSERT triggers on signups, sellers and
// auth.users POST an event payload here via pg_net (see the
// owner_event_alerts migration); we format a plain-text email and send it to
// the platform owner via Resend.
//
// Destination resolution: the OPS_ALERT_EMAIL function secret if set, else
// the `owner_alert_email` Vault secret via public.get_owner_alert_email().
// Fully gated like ops-health-alert: with no destination or Resend env it
// logs and no-ops — an alert must never surface an error to the caller.
//
// Auth mirrors the cron functions: x-cron-secret (CRON_SECRET) or a
// service-role bearer. Self-contained (no ../_shared imports) so it can be
// deployed as a single unit outside the full-repo CI deploy.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { formatOwnerAlert, type OwnerEventPayload } from './format.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const cronSecret = Deno.env.get('CRON_SECRET') || ''

const alertEmail = Deno.env.get('OPS_ALERT_EMAIL') || ''
const resendApiKey = Deno.env.get('RESEND_API_KEY') || ''
const resendFrom = Deno.env.get('RESEND_FROM_EMAIL') || ''
const resendFromName = Deno.env.get('RESEND_FROM_NAME') || 'UpNext'

/** Mirror of _shared/auth.timingSafeEqual — constant-time secret compare. */
function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

Deno.serve(async (req: Request) => {
  const auth = req.headers.get('authorization') || ''
  const providedSecret = req.headers.get('x-cron-secret') || ''
  const hasServiceRole = timingSafeEqual(auth, `Bearer ${supabaseServiceKey}`)
  const hasCronSecret = timingSafeEqual(providedSecret, cronSecret)

  if (!hasServiceRole && !hasCronSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: OwnerEventPayload
  try {
    payload = (await req.json()) as OwnerEventPayload
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const content = formatOwnerAlert(payload)
  if (!content) {
    return new Response(`Unknown event type: ${payload.type ?? '(none)'}`, { status: 400 })
  }

  const to = alertEmail || (await vaultAlertEmail())
  if (!to || !resendApiKey || !resendFrom) {
    console.warn('owner-event-alert: event received but alerting not configured', payload.type)
    return json({ alerted: false })
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${resendFromName} <${resendFrom}>`,
        to: [to],
        subject: content.subject,
        text: content.text,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      console.error('owner-event-alert: Resend send failed', res.status, await res.text())
      return json({ alerted: false })
    }
    return json({ alerted: true })
  } catch (err) {
    console.error('owner-event-alert: Resend send errored', err)
    return json({ alerted: false })
  }
})

/** Owner address from Vault (service-role RPC). Empty string when unset. */
async function vaultAlertEmail(): Promise<string> {
  if (!supabaseUrl || !supabaseServiceKey) return ''
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await supabase.rpc('get_owner_alert_email')
    if (error) {
      console.error('owner-event-alert: get_owner_alert_email failed', error.message)
      return ''
    }
    return typeof data === 'string' ? data : ''
  } catch {
    return ''
  }
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
