// Cron-triggered ops health alert.
//
// Runs public.ops_health_check() and, if any money-state anomaly count is
// non-zero, emails a summary to OPS_ALERT_EMAIL via Resend. Fully gated: with no
// OPS_ALERT_EMAIL (or Resend env) set it still runs the check and returns the
// summary, but sends nothing — a safe no-op until the destination is wired.
//
// Auth mirrors the other cron functions: x-cron-secret (CRON_SECRET) or a
// service-role bearer.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
// Shared cron auth secret, sent by the pg_cron jobs as the x-cron-secret header.
const cronSecret = Deno.env.get('CRON_SECRET') || ''

const alertEmail = Deno.env.get('OPS_ALERT_EMAIL') || ''
const resendApiKey = Deno.env.get('RESEND_API_KEY') || ''
const resendFrom = Deno.env.get('RESEND_FROM_EMAIL') || ''
const resendFromName = Deno.env.get('RESEND_FROM_NAME') || 'Openspot'

Deno.serve(async (req: Request) => {
  const auth = req.headers.get('authorization') || ''
  const providedSecret = req.headers.get('x-cron-secret') || ''
  const hasServiceRole = auth === `Bearer ${supabaseServiceKey}`
  const hasCronSecret = cronSecret && providedSecret === cronSecret

  if (!hasServiceRole && !hasCronSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await supabase.rpc('ops_health_check')
    if (error) {
      return new Response(`Health check failed: ${error.message}`, { status: 500 })
    }

    const checks = (data ?? {}) as Record<string, number>
    const failing = Object.entries(checks).filter(([, count]) => Number(count) > 0)
    const total = failing.reduce((sum, [, count]) => sum + Number(count), 0)

    const alerted = total > 0 ? await sendAlert(checks, failing) : false

    return new Response(
      JSON.stringify({ checks, total_anomalies: total, alerted }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown'
    return new Response(`Ops health error: ${message}`, { status: 500 })
  }
})

// Email a plain-text anomaly summary via the Resend REST API. Optional: with no
// destination or Resend config we log and return false (the caller still reports
// the anomaly counts in its response).
async function sendAlert(
  checks: Record<string, number>,
  failing: [string, number][],
): Promise<boolean> {
  if (!alertEmail || !resendApiKey || !resendFrom) {
    console.warn('ops-health-alert: anomalies found but alerting not configured', checks)
    return false
  }

  const lines = failing.map(([name, count]) => `- ${name}: ${count}`).join('\n')
  const text =
    'Ops health check found money-state anomalies in the Openspot database:\n\n' +
    `${lines}\n\n` +
    `Full result: ${JSON.stringify(checks)}\n\n` +
    'Investigate in Supabase (signups / payment_attempts) and reconcile against ' +
    'Stripe. Do not hand-edit money state in SQL.'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${resendFromName} <${resendFrom}>`,
        to: [alertEmail],
        subject: `Openspot ops: ${failing.length} payment anomaly type(s) detected`,
        text,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('ops-health-alert: Resend send failed', res.status, body)
      return false
    }
    return true
  } catch (err) {
    console.error('ops-health-alert: Resend send threw', (err as Error).message)
    return false
  }
}
