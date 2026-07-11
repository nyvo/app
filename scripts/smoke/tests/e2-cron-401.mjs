// scripts/smoke/tests/e2-cron-401.mjs
// Checklist: E2 — Cron-only edge functions return 401 without the shared
// x-cron-secret (or a service-role bearer). All four have verify_jwt=false
// (they're invoked by pg_cron with a plain header, no Supabase JWT), so the
// 401 must come from the function's OWN check, not the gateway.

import { callFunction } from '../lib/edge.mjs'

export const meta = { id: 'E2', title: 'Cron endpoints reject requests with no cron secret / service-role', owner: '🤖' }

const CRON_FUNCTIONS = [
  'sweep-pending-payments',
  'ops-health-alert',
  'send-class-reminders',
  'send-pending-confirmations',
]

export async function run(_ctx) {
  const results = []
  for (const name of CRON_FUNCTIONS) {
    const res = await callFunction(name, { method: 'POST' })
    results.push({ name, status: res.status, pass: res.status === 401 })
  }
  const failed = results.filter((r) => !r.pass)
  const summary = results.map((r) => `${r.name}=${r.status}`).join(', ')
  return {
    pass: failed.length === 0,
    details: failed.length === 0
      ? `All ${results.length} cron endpoints returned 401 with no secret: ${summary}`
      : `Endpoints NOT returning 401: ${failed.map((r) => `${r.name}=${r.status}`).join(', ')} (full: ${summary})`,
  }
}
