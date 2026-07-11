// scripts/smoke/tests/e4-rate-limit.mjs
// Checklist: E4 — Rate limiting trips. N× create-free-signup / connect-session.
//
// CAUTION: this deliberately exhausts the real per-IP rate-limit buckets
// (check_rate_limit: 10/hour for free-signup, 20/hour for connect-session —
// see supabase/functions/create-free-signup/index.ts and
// create-stripe-connect-session/index.ts). Both buckets are keyed on the
// caller's IP and shared with every other money-path test in this harness
// run from the same machine. Run this LAST, or in its own `run.mjs` invocation,
// so it doesn't 429 the A-section tests that need those same endpoints to
// actually succeed.
//
// Uses a bogus (well-formed but non-existent) courseId so no course/signup
// logic ever runs — the limiter check happens before the course lookup in
// both functions, so this never touches real data.

import { callFunction } from '../lib/edge.mjs'

export const meta = { id: 'E4', title: 'Rate limiting trips on repeated calls (run LAST — burns the IP bucket)', owner: '🤖' }

const BOGUS_COURSE_ID = '00000000-0000-4000-8000-000000000000'
const BOGUS_TICKET_TYPE_ID = '00000000-0000-4000-8000-000000000001'

async function hammer(ctx, { name, count, buildBody }) {
  let got429 = false
  const statuses = []
  for (let i = 0; i < count; i += 1) {
    const res = await callFunction(name, { body: buildBody(i) })
    statuses.push(res.status)
    if (res.status === 429) {
      got429 = true
      break
    }
  }
  return { name, got429, statuses }
}

export async function run(ctx) {
  // Reuse ONE address per endpoint so the per-EMAIL bucket accumulates
  // (free-signup 5/email/h, connect 10/email/h). The per-IP bucket can't be
  // relied on here: some sandboxes rotate egress IPs, so a fresh address per
  // call would never trip either bucket. Per-email is IP-independent.
  const freeEmail = ctx.mailosaur.mint('e4-free')
  const freeSignup = await hammer(ctx, {
    name: 'create-free-signup',
    count: 15,
    buildBody: () => ({
      courseId: BOGUS_COURSE_ID,
      participantName: 'Smoke Test E4',
      participantEmail: freeEmail,
      participantPhone: '99999999',
    }),
  })

  const connectEmail = ctx.mailosaur.mint('e4-connect')
  const connectSession = await hammer(ctx, {
    name: 'create-stripe-connect-session',
    count: 25,
    buildBody: () => ({
      courseId: BOGUS_COURSE_ID,
      organizationSlug: 'smoke-e4-nonexistent-slug',
      ticketTypeId: BOGUS_TICKET_TYPE_ID,
      customerEmail: connectEmail,
      customerName: 'Smoke Test E4',
      customerPhone: '99999999',
    }),
  })

  const results = [freeSignup, connectSession]
  const failed = results.filter((r) => !r.got429)
  const summary = results.map((r) => `${r.name}: ${r.got429 ? 'tripped' : 'NEVER tripped'} (${r.statuses.length} calls, statuses=${r.statuses.join(',')})`).join(' | ')

  return { pass: failed.length === 0, details: summary }
}
