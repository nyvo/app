// scripts/smoke/tests/e1-jwt-gated-401.mjs
// Checklist: E1 — JWT-gated edge functions return 401 without a token.
//
// Every function NOT listed in supabase/config.toml defaults to verify_jwt=true
// at the gateway — the request never reaches the function's own code without a
// valid (any) JWT in the Authorization header. Confirmed against
// supabase/config.toml (only 10 functions there set verify_jwt=false) plus the
// google-places source comment noting the same default.

import { callFunction } from '../lib/edge.mjs'

export const meta = { id: 'E1', title: 'JWT-gated functions reject requests with no Authorization header', owner: '🤖' }

const JWT_GATED_FUNCTIONS = [
  'cancel-course',
  'check-stripe-connect-status',
  'create-stripe-checkout-session',
  'create-stripe-connect-account',
  'create-stripe-portal-session',
  'delete-account',
  'get-stripe-settlements',
  'google-places',
  'send-course-message',
  'send-support-message',
  'set-operating-model',
  'teacher-cancel-signup',
  'update-session',
]

export async function run(_ctx) {
  const results = []
  for (const name of JWT_GATED_FUNCTIONS) {
    const res = await callFunction(name, { body: {} })
    results.push({ name, status: res.status, pass: res.status === 401 })
  }
  const failed = results.filter((r) => !r.pass)
  const summary = results.map((r) => `${r.name}=${r.status}`).join(', ')
  return {
    pass: failed.length === 0,
    details: failed.length === 0
      ? `All ${results.length} JWT-gated functions returned 401: ${summary}`
      : `Functions NOT returning 401: ${failed.map((r) => `${r.name}=${r.status}`).join(', ')} (full: ${summary})`,
  }
}
