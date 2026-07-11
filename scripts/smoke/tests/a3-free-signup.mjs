// scripts/smoke/tests/a3-free-signup.mjs
// Checklist: A3 — Free-course signup end-to-end. Verify: signup row +
// confirmation email (Mailosaur).
//
// Requires: SMOKE_FREE_COURSE_ID.

import { pollUntil } from '../lib/poll.mjs'

export const meta = { id: 'A3', title: 'Free-course signup end-to-end + confirmation email', owner: '🤖' }

export async function run(ctx) {
  const courseId = ctx.fixtures.freeCourseId()
  const email = ctx.mailosaur.mint('a3-free-signup')

  const res = await ctx.callFunction('create-free-signup', {
    body: {
      courseId,
      participantName: 'Smoke Test A3',
      participantEmail: email,
      participantPhone: '99999999',
    },
  })
  if (res.status !== 200 || !res.json?.signupId) {
    return { pass: false, details: `create-free-signup failed: ${res.status} ${res.text}` }
  }
  const signupId = res.json.signupId
  ctx.manifest.record('signup', signupId)

  const service = ctx.db.service()
  const { data: signup, error } = await service
    .from('signups')
    .select('id, status, payment_status, amount_paid')
    .eq('id', signupId)
    .maybeSingle()
  if (error || !signup) {
    return { pass: false, details: `Signup row ${signupId} not found: ${error?.message ?? 'missing'}` }
  }
  if (signup.status !== 'confirmed' || signup.payment_status !== 'paid') {
    return {
      pass: false,
      details: `Unexpected signup state: status=${signup.status} payment_status=${signup.payment_status}`,
    }
  }

  const message = await pollUntil(
    () => ctx.mailosaur.waitForMessage({ sentTo: email, timeoutMs: 5_000, pollIntervalMs: 2_000 }).catch(() => null),
    { label: `confirmation email to ${email}`, timeoutMs: 40_000, intervalMs: 3_000 },
  )

  return {
    pass: true,
    details: `signup ${signupId} confirmed+paid (amount_paid=${signup.amount_paid}); email "${message.subject}" received`,
  }
}
