// scripts/smoke/lib/fixtures.mjs
//
// This harness runs against the shared, already-seeded production DB (per
// docs/smoke-test-checklist.md — "Local = ... the shared Supabase DB"). It
// does not seed its own courses/sellers (the task that built this harness
// was explicitly told not to create signups or trigger Stripe events), so
// money-path tests need real fixture ids handed in via env vars.
//
// Every getter below reads `process.env` / `.env.local` (via lib/env.mjs's
// readVar) and throws a FixtureError with a human-actionable message when
// unset. Tests catch FixtureError and report SKIP (not FAIL) — an unset
// fixture is a setup gap, not a broken product.
//
// Nothing here executes on import.

import { readVar } from './env.mjs'
import { createAuthClient } from './db.mjs'

export class FixtureError extends Error {
  constructor(message) {
    super(message)
    this.name = 'FixtureError'
  }
}

function required(name, hint) {
  const value = readVar(name)
  if (!value) {
    throw new FixtureError(`${name} not set — ${hint} (see scripts/smoke/README.md#fixtures)`)
  }
  return value
}

function optional(name) {
  return readVar(name) || null
}

export const fixtures = {
  /** Storefront slug (organizationSlug) for a seller with Stripe Connect onboarding complete. */
  sellerSlug: () => required('SMOKE_SELLER_SLUG', 'slug of a seller with charges_enabled Stripe Connect'),

  /** Published, paid course (price > 0) with headroom in max_participants — safe for repeated bookings. */
  paidCourseId: () => required('SMOKE_PAID_COURSE_ID', 'id of a published paid course, not near capacity'),
  paidTicketTypeId: () => required('SMOKE_PAID_TICKET_TYPE_ID', 'id of an active package/pass ticket type on SMOKE_PAID_COURSE_ID'),

  /** Published free course (price <= 0) with an active default ticket tier. */
  freeCourseId: () => required('SMOKE_FREE_COURSE_ID', 'id of a published free course'),

  /** Course with max_participants set and exactly 1 confirmed-signup seat remaining — for the A4 oversell race. */
  lastSeatCourseId: () => required('SMOKE_LAST_SEAT_COURSE_ID', 'id of a course with exactly 1 seat left'),
  lastSeatTicketTypeId: () => required('SMOKE_LAST_SEAT_TICKET_TYPE_ID', 'ticket type id for SMOKE_LAST_SEAT_COURSE_ID'),

  /** A5 sub-fixtures — each optional individually; the A5 test skips whichever sub-case is unset. */
  soldOutCourseId: () => optional('SMOKE_SOLD_OUT_COURSE_ID'),
  soldOutTicketTypeId: () => optional('SMOKE_SOLD_OUT_TICKET_TYPE_ID'),
  startedSeriesCourseId: () => optional('SMOKE_STARTED_SERIES_COURSE_ID'),
  startedSeriesTicketTypeId: () => optional('SMOKE_STARTED_SERIES_TICKET_TYPE_ID'),
  pastSessionCourseId: () => optional('SMOKE_PAST_SESSION_COURSE_ID'),
  pastSessionTicketTypeId: () => optional('SMOKE_PAST_SESSION_TICKET_TYPE_ID'),
  pastSessionId: () => optional('SMOKE_PAST_SESSION_ID'),
  cancelledCourseId: () => optional('SMOKE_CANCELLED_COURSE_ID'),
  cancelledTicketTypeId: () => optional('SMOKE_CANCELLED_TICKET_TYPE_ID'),

  /**
   * A THROWAWAY course dedicated to A10 (cancel-course) — cancel-course
   * irreversibly flips courses.status to 'cancelled'. Must NOT be the same
   * course as SMOKE_PAID_COURSE_ID (which other tests reuse repeatedly).
   */
  cancellableCourseId: () => required('SMOKE_CANCELLABLE_COURSE_ID', 'id of a throwaway paid course, ok to permanently cancel'),
  cancellableTicketTypeId: () => required('SMOKE_CANCELLABLE_TICKET_TYPE_ID', 'ticket type id for SMOKE_CANCELLABLE_COURSE_ID'),

  /** A SECOND throwaway cancellable course, dedicated to A11 so it doesn't collide with A10's. */
  cancellableCourseIdA11: () => required('SMOKE_CANCELLABLE_COURSE_ID_A11', 'id of a 2nd throwaway paid course, ok to permanently cancel (A11 only)'),
  cancellableTicketTypeIdA11: () => required('SMOKE_CANCELLABLE_TICKET_TYPE_ID_A11', 'ticket type id for SMOKE_CANCELLABLE_COURSE_ID_A11'),

  /** Seller-owner credentials for calling JWT-gated seller endpoints (teacher-cancel-signup, cancel-course). */
  sellerOwnerEmail: () => required('SMOKE_SELLER_OWNER_EMAIL', 'login email of the fixture seller owner (password auth enabled)'),
  sellerOwnerPassword: () => required('SMOKE_SELLER_OWNER_PASSWORD', 'password for SMOKE_SELLER_OWNER_EMAIL'),

  /** Domain to run F6 DNS checks against. */
  dnsDomain: () => optional('SMOKE_DNS_DOMAIN') || 'raden.no',
}

let cachedSession = null

/**
 * Sign in as the fixture seller owner (password auth) and return an
 * Authorization header carrying a real user access token — the only way to
 * call teacher-cancel-signup / cancel-course, which require a genuine
 * Supabase JWT (verifyAuth + verifyOrgMembership), not the anon/service key.
 * Cached for the process lifetime so repeated calls don't re-authenticate.
 */
export async function sellerOwnerAuthHeader() {
  if (cachedSession) return { Authorization: `Bearer ${cachedSession.access_token}` }
  const email = fixtures.sellerOwnerEmail()
  const password = fixtures.sellerOwnerPassword()
  // Dedicated client — signing in on the shared getAnonClient() would turn
  // every later "anon" read into an authenticated one (broke F3).
  const { data, error } = await createAuthClient().auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    throw new FixtureError(
      `Could not sign in as SMOKE_SELLER_OWNER_EMAIL (${email}): ${error?.message ?? 'no session returned'}`,
    )
  }
  cachedSession = data.session
  return { Authorization: `Bearer ${cachedSession.access_token}` }
}
