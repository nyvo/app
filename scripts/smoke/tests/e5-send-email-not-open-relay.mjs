// scripts/smoke/tests/e5-send-email-not-open-relay.mjs
// Checklist: E5 — send-email is not an open relay. POST without the exact
// service-role bearer → 401. It has verify_jwt=false (invoked
// function-to-function, never from the frontend), so the only guard is its
// own `auth !== Bearer ${serviceRoleKey}` check.

import { callFunction } from '../lib/edge.mjs'

export const meta = { id: 'E5', title: 'send-email rejects callers without the service-role bearer', owner: '🤖' }

export async function run(ctx) {
  const sendEmailBody = {
    template: 'order-confirm',
    to: ctx.mailosaur.mint('e5-should-never-send'),
    props: { buyerName: 'x', studioName: 'x', courseTitle: 'x' },
  }

  const noAuth = await callFunction('send-email', { body: sendEmailBody })
  const anonAuth = ctx.env.VITE_SUPABASE_ANON_KEY
    ? await callFunction('send-email', { body: sendEmailBody, headers: { Authorization: `Bearer ${ctx.env.VITE_SUPABASE_ANON_KEY}` } })
    : null
  const bogusAuth = await callFunction('send-email', { body: sendEmailBody, headers: { Authorization: 'Bearer not-a-real-key' } })

  const checks = [
    { name: 'no Authorization header', status: noAuth.status, pass: noAuth.status === 401 },
    ...(anonAuth ? [{ name: 'anon key as bearer', status: anonAuth.status, pass: anonAuth.status === 401 }] : []),
    { name: 'bogus bearer', status: bogusAuth.status, pass: bogusAuth.status === 401 },
  ]
  const failed = checks.filter((c) => !c.pass)
  const summary = checks.map((c) => `${c.name}=${c.status}`).join(', ')
  return { pass: failed.length === 0, details: summary }
}
