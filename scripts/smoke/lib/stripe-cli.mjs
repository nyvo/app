// scripts/smoke/lib/stripe-cli.mjs
//
// Thin wrappers over the `stripe` CLI child process (node:child_process).
// Nothing executes on import — every export just returns a function.
//
// Why the CLI and not the Stripe REST API directly: this harness deliberately
// never holds STRIPE_SECRET_KEY locally (it's not in .env.local, only the
// pk_test_ publishable key is). The Stripe CLI authenticates using its own
// logged-in session (`stripe login`, stored in ~/.config/stripe/config.toml)
// — confirmed installed + logged into the Framio test account per the launch
// checklist setup notes. Resource subcommands (`stripe payment_intents
// confirm|retrieve|cancel ...`) are direct 1:1 wrappers over the API and
// print the raw JSON response on stdout, so we can treat this exactly like a
// signed API call without ever touching a secret key ourselves.
//
// `stripe payment_intents confirm <id> --payment-method pm_card_visa` is the
// CLI-native way to confirm a PaymentIntent with a test payment method
// server-side; there is no separate "confirm via publishable key" REST path
// (publishable keys are for Stripe.js in the browser only), so the CLI is
// the documented, clean option here — not a fallback.
//
// SAFETY: every invocation runs in TEST mode. `--live` is actively rejected,
// both if a caller passes it in `extraArgs` and if it's present anywhere on
// process.argv (belt + suspenders — this must never be reachable).

import { spawnSync, execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

function assertNeverLive(args) {
  if (args.includes('--live')) {
    throw new Error('stripe-cli: --live is never allowed from the smoke harness')
  }
  if (process.argv.includes('--live')) {
    throw new Error('stripe-cli: refusing to run — --live was passed on the command line')
  }
}

function runCli(args) {
  assertNeverLive(args)
  const result = spawnSync('stripe', args, { encoding: 'utf8' })
  if (result.error) {
    throw new Error(`stripe CLI failed to start (is it installed and on PATH?): ${result.error.message}`)
  }
  return result
}

function parseJsonOutput(result, label) {
  if (result.status !== 0) {
    throw new Error(`${label} failed (exit ${result.status}): ${result.stderr || result.stdout}`)
  }
  let parsed
  try {
    parsed = JSON.parse(result.stdout)
  } catch {
    throw new Error(`${label} did not return JSON on stdout: ${result.stdout.slice(0, 500)}`)
  }
  // The Stripe CLI prints an error OBJECT (exit 0) when the API rejects a
  // request — surface it instead of returning a statusless object that a
  // caller would misread as "unexpected status: undefined".
  if (parsed && parsed.error) {
    throw new Error(`${label} returned a Stripe error: ${parsed.error.message || parsed.error.code}`)
  }
  return parsed
}

// Confirming server-side with a test card still requires a return_url because
// the app's PaymentIntents enable automatic_payment_methods with redirect-
// capable methods (klarna/link). Any valid URL satisfies Stripe in test mode.
const CONFIRM_RETURN_URL = 'https://upnext.no/checkout/success'

/**
 * Async (non-blocking) CLI invocation — for the ONE thing spawnSync can't do:
 * fire two `stripe` subprocesses so they're genuinely in flight at the same
 * time (see confirmPaymentIntentConcurrently below). Everything else in this
 * module is deliberately synchronous — it's simpler and test ordering doesn't
 * matter — but a synchronous confirm of PI-A fully completes (network
 * round-trip included) before PI-B's confirm even starts, which would let
 * Stripe's webhook for A settle the seat before B is ever confirmed. That
 * defeats the actual race the A4/A6 tests exist to exercise.
 */
async function runCliAsync(args, label) {
  assertNeverLive(args)
  try {
    const { stdout } = await execFileAsync('stripe', args)
    try {
      return JSON.parse(stdout)
    } catch {
      throw new Error(`${label} did not return JSON on stdout: ${stdout.slice(0, 500)}`)
    }
  } catch (err) {
    if (err.stdout !== undefined || err.stderr !== undefined) {
      throw new Error(`${label} failed: ${err.stderr || err.stdout || err.message}`)
    }
    throw err
  }
}

/**
 * Confirm N PaymentIntents concurrently (real overlapping subprocesses, not
 * spawnSync back-to-back) — use this instead of a `.map(confirmPaymentIntent)`
 * loop whenever the test's whole point is racing two confirms against each
 * other (A4 oversell, A6 double-submit). Returns Promise.allSettled results.
 */
export function confirmPaymentIntentsConcurrently(paymentIntentIds, paymentMethod = 'pm_card_visa') {
  return Promise.allSettled(
    paymentIntentIds.map((id) =>
      runCliAsync(
        ['payment_intents', 'confirm', id, '--payment-method', paymentMethod, '-d', `return_url=${CONFIRM_RETURN_URL}`],
        `stripe payment_intents confirm ${id}`,
      ),
    ),
  )
}

/**
 * `stripe trigger <event>` — fires a real test-mode webhook event (and any
 * side-effect API objects Stripe needs to create it). Output is human-
 * readable text, not JSON, so this returns raw stdout for the caller to
 * grep/log rather than parsing it.
 *
 * `overrides` / `add` accept Stripe's own `resource:property=value` syntax,
 * e.g. `{ overrides: { 'charge:amount': '1000' } }`.
 */
export function trigger(event, { overrides = {}, add = {}, skip = [] } = {}) {
  const args = ['trigger', event]
  for (const [key, value] of Object.entries(overrides)) {
    args.push('--override', `${key}=${value}`)
  }
  for (const [key, value] of Object.entries(add)) {
    args.push('--add', `${key}=${value}`)
  }
  for (const step of skip) {
    args.push('--skip', step)
  }
  const result = runCli(args)
  if (result.status !== 0) {
    throw new Error(`stripe trigger ${event} failed: ${result.stderr || result.stdout}`)
  }
  return result.stdout
}

/** Confirm a PaymentIntent with a test payment method (pm_card_visa, pm_card_chargeDeclined, ...). */
export function confirmPaymentIntent(paymentIntentId, paymentMethod = 'pm_card_visa') {
  const result = runCli([
    'payment_intents', 'confirm', paymentIntentId,
    '--payment-method', paymentMethod,
    '-d', `return_url=${CONFIRM_RETURN_URL}`,
  ])
  return parseJsonOutput(result, `stripe payment_intents confirm ${paymentIntentId}`)
}

export function retrievePaymentIntent(paymentIntentId) {
  const result = runCli(['payment_intents', 'retrieve', paymentIntentId])
  return parseJsonOutput(result, `stripe payment_intents retrieve ${paymentIntentId}`)
}

export function cancelPaymentIntent(paymentIntentId) {
  const result = runCli(['payment_intents', 'cancel', paymentIntentId])
  return parseJsonOutput(result, `stripe payment_intents cancel ${paymentIntentId}`)
}

export function retrieveCharge(chargeId) {
  const result = runCli(['charges', 'retrieve', chargeId])
  return parseJsonOutput(result, `stripe charges retrieve ${chargeId}`)
}

/** Most recent events of `type` (default-sorted newest first by the API). */
export function listEvents(type, limit = 5) {
  const result = runCli(['events', 'list', '--type', type, '--limit', String(limit)])
  return parseJsonOutput(result, `stripe events list --type ${type}`).data ?? []
}

export function listWebhookEndpoints(limit = 20) {
  const result = runCli(['webhook_endpoints', 'list', '--limit', String(limit)])
  return parseJsonOutput(result, 'stripe webhook_endpoints list').data ?? []
}

/** First configured webhook endpoint whose URL contains `urlFragment` (e.g. 'stripe-connect-webhook'). */
export function findWebhookEndpoint(urlFragment) {
  return listWebhookEndpoints().find((ep) => (ep.url || '').includes(urlFragment)) ?? null
}

/**
 * Redeliver an EXISTING event id to a webhook endpoint — the correct tool for
 * testing our idempotency claim (processed_webhook_events keyed on event.id):
 * `stripe trigger` always mints a brand-new event id, so triggering the same
 * event type twice can never exercise the same-event-id dedup path. Resend
 * does — Stripe replays the exact original signed payload under the exact
 * original event id.
 */
export function resendEvent(eventId, webhookEndpointId) {
  const args = ['events', 'resend', eventId]
  if (webhookEndpointId) args.push('--webhook-endpoint', webhookEndpointId)
  const result = runCli(args)
  return parseJsonOutput(result, `stripe events resend ${eventId}`)
}
