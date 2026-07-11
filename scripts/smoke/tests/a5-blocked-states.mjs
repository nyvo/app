// scripts/smoke/tests/a5-blocked-states.mjs
// Checklist: A5 — Sold-out / started-series / past-session / cancelled courses
// must be blocked SERVER-SIDE (a direct API call, not just a UI affordance).
//
// Four independent sub-cases, each gated by its own optional fixture — a
// sub-case with no fixture configured is reported as skipped rather than
// failing the whole test. Requires SMOKE_SELLER_SLUG plus any subset of:
//   SMOKE_SOLD_OUT_COURSE_ID / SMOKE_SOLD_OUT_TICKET_TYPE_ID
//   SMOKE_STARTED_SERIES_COURSE_ID / SMOKE_STARTED_SERIES_TICKET_TYPE_ID
//   SMOKE_PAST_SESSION_COURSE_ID / SMOKE_PAST_SESSION_TICKET_TYPE_ID / SMOKE_PAST_SESSION_ID
//   SMOKE_CANCELLED_COURSE_ID / SMOKE_CANCELLED_TICKET_TYPE_ID

export const meta = { id: 'A5', title: 'Sold-out/started-series/past-session/cancelled blocked server-side', owner: '🤖' }

async function attemptBooking(ctx, { courseId, ticketTypeId, sessionId, label }) {
  const organizationSlug = ctx.fixtures.sellerSlug()
  const email = ctx.mailosaur.mint(label)
  const res = await ctx.callFunction('create-stripe-connect-session', {
    body: {
      courseId,
      organizationSlug,
      ticketTypeId,
      customerEmail: email,
      customerName: `Smoke Test ${label}`,
      customerPhone: '99999999',
      ...(sessionId ? { sessionId } : {}),
    },
  })
  // A rejected booking never creates a payment_attempt row server-side (the
  // guards in create-stripe-connect-session run before the insert), so there's
  // nothing to manifest here even on an unexpected 200.
  if (res.status === 200 && res.json?.attemptId) {
    ctx.manifest.record('payment_attempt', res.json.attemptId, res.json.paymentIntentId)
  }
  return res
}

async function runSubCase(ctx, name, getFixtures, buildBody) {
  let ids
  try {
    ids = getFixtures()
  } catch (err) {
    if (err instanceof ctx.FixtureError) return { name, skipped: true, details: err.message }
    throw err
  }
  const res = await attemptBooking(ctx, buildBody(ids))
  if (res.status >= 200 && res.status < 300) {
    return { name, pass: false, details: `Expected a rejection, got ${res.status}: ${res.text}` }
  }
  return { name, pass: true, details: `Rejected with ${res.status}: ${res.json?.error ?? res.text}` }
}

export async function run(ctx) {
  const results = []

  results.push(
    await runSubCase(
      ctx,
      'sold-out',
      () => {
        const courseId = ctx.fixtures.soldOutCourseId()
        const ticketTypeId = ctx.fixtures.soldOutTicketTypeId()
        if (!courseId || !ticketTypeId) throw new ctx.FixtureError('SMOKE_SOLD_OUT_COURSE_ID / SMOKE_SOLD_OUT_TICKET_TYPE_ID not set')
        return { courseId, ticketTypeId }
      },
      ({ courseId, ticketTypeId }) => ({ courseId, ticketTypeId, label: 'a5-sold-out' }),
    ),
  )

  results.push(
    await runSubCase(
      ctx,
      'started-series',
      () => {
        const courseId = ctx.fixtures.startedSeriesCourseId()
        const ticketTypeId = ctx.fixtures.startedSeriesTicketTypeId()
        if (!courseId || !ticketTypeId) throw new ctx.FixtureError('SMOKE_STARTED_SERIES_COURSE_ID / SMOKE_STARTED_SERIES_TICKET_TYPE_ID not set')
        return { courseId, ticketTypeId }
      },
      ({ courseId, ticketTypeId }) => ({ courseId, ticketTypeId, label: 'a5-started-series' }),
    ),
  )

  results.push(
    await runSubCase(
      ctx,
      'past-session',
      () => {
        const courseId = ctx.fixtures.pastSessionCourseId()
        const ticketTypeId = ctx.fixtures.pastSessionTicketTypeId()
        const sessionId = ctx.fixtures.pastSessionId()
        if (!courseId || !ticketTypeId || !sessionId) {
          throw new ctx.FixtureError('SMOKE_PAST_SESSION_COURSE_ID / SMOKE_PAST_SESSION_TICKET_TYPE_ID / SMOKE_PAST_SESSION_ID not set')
        }
        return { courseId, ticketTypeId, sessionId }
      },
      ({ courseId, ticketTypeId, sessionId }) => ({ courseId, ticketTypeId, sessionId, label: 'a5-past-session' }),
    ),
  )

  results.push(
    await runSubCase(
      ctx,
      'cancelled',
      () => {
        const courseId = ctx.fixtures.cancelledCourseId()
        const ticketTypeId = ctx.fixtures.cancelledTicketTypeId()
        if (!courseId || !ticketTypeId) throw new ctx.FixtureError('SMOKE_CANCELLED_COURSE_ID / SMOKE_CANCELLED_TICKET_TYPE_ID not set')
        return { courseId, ticketTypeId }
      },
      ({ courseId, ticketTypeId }) => ({ courseId, ticketTypeId, label: 'a5-cancelled' }),
    ),
  )

  const run_ = results.filter((r) => !r.skipped)
  if (run_.length === 0) {
    return { pass: null, skipped: true, details: 'All 4 sub-cases skipped — no A5 fixtures configured.' }
  }
  const failed = run_.filter((r) => !r.pass)
  const summary = results.map((r) => `${r.name}: ${r.skipped ? 'SKIP' : r.pass ? 'ok' : 'FAIL'} (${r.details})`).join('; ')
  return { pass: failed.length === 0, details: summary }
}
