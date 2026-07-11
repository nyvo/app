#!/usr/bin/env node
// scripts/smoke/cleanup.mjs
//
// Deletes/voids EXACTLY the resources recorded in scripts/smoke/.manifest.json
// — never a blanket or pattern-based delete. Run after every smoke session
// (test rows land in the shared Supabase DB, per docs/smoke-test-checklist.md).
//
// Safety: mirrors run.mjs's guard. With no flags, or with --dry-run, this
// only PRINTS what it would do and touches nothing. Destructive action
// requires --confirm.
//
//   node scripts/smoke/cleanup.mjs            # dry run (default, safe)
//   node scripts/smoke/cleanup.mjs --dry-run  # same, explicit
//   node scripts/smoke/cleanup.mjs --confirm  # actually delete/void

import { assertTestMode } from './lib/env.mjs'
import { getServiceClient } from './lib/db.mjs'
import { listEntries, clearManifest, manifestPath } from './lib/manifest.mjs'
import { retrievePaymentIntent, cancelPaymentIntent } from './lib/stripe-cli.mjs'

// Delete children before parents — FK-safe order.
const DELETE_ORDER = ['signup', 'payment_attempt', 'course_session', 'course', 'seller']

const TABLE_BY_TYPE = {
  signup: 'signups',
  payment_attempt: 'payment_attempts',
  course_session: 'course_sessions',
  course: 'courses',
  seller: 'sellers',
}

// PaymentIntent statuses that still hold a live authorization worth voiding.
const CANCELABLE_PI_STATUSES = new Set([
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
  'requires_capture',
])

async function cleanupPaymentIntents(entries, { dryRun }) {
  const piEntries = entries.filter((entry) => entry.type === 'payment_intent')
  for (const entry of piEntries) {
    const piId = entry.stripe_id || entry.id
    if (dryRun) {
      console.log(`[dry-run] would check/cancel PaymentIntent ${piId}`)
      continue
    }
    try {
      const pi = await retrievePaymentIntent(piId)
      if (CANCELABLE_PI_STATUSES.has(pi.status)) {
        await cancelPaymentIntent(piId)
        console.log(`[cleanup] cancelled PaymentIntent ${piId} (was ${pi.status})`)
      } else {
        console.log(`[cleanup] PaymentIntent ${piId} already terminal (${pi.status}) — left as-is`)
      }
    } catch (err) {
      console.error(`[cleanup] failed to reconcile PaymentIntent ${piId}: ${err.message}`)
    }
  }
}

// Backstop for the webhook race: the payment webhook mints the signup
// asynchronously, so a test that fails (or is killed) after create+confirm but
// before it records the signup id leaves an orphaned signup the type-based
// delete below would miss. Every such signup carries a manifest'd
// stripe_payment_intent_id, so delete by that backlink too — scoped strictly to
// PIs this run created, never a blanket delete.
async function cleanupSignupsByPaymentIntent(entries, { dryRun }) {
  const piIds = entries
    .filter((entry) => entry.type === 'payment_intent')
    .map((entry) => entry.stripe_id || entry.id)
    .filter(Boolean)
  if (piIds.length === 0) return
  if (dryRun) {
    console.log(`[dry-run] would delete any signups back-linked to ${piIds.length} manifest PaymentIntent(s)`)
    return
  }
  const { error, count } = await getServiceClient()
    .from('signups')
    .delete({ count: 'exact' })
    .in('stripe_payment_intent_id', piIds)
  if (error) {
    console.error(`[cleanup] failed to delete signups by payment_intent: ${error.message}`)
  } else if (count) {
    console.log(`[cleanup] deleted ${count} signup(s) via payment_intent backlink (webhook-minted, unrecorded)`)
  }
}

async function cleanupRows(entries, { dryRun }) {
  for (const type of DELETE_ORDER) {
    const ids = entries.filter((entry) => entry.type === type).map((entry) => entry.id)
    if (ids.length === 0) continue
    const table = TABLE_BY_TYPE[type]
    if (dryRun) {
      console.log(`[dry-run] would delete ${ids.length} row(s) from ${table}: ${ids.join(', ')}`)
      continue
    }
    const { error, count } = await getServiceClient()
      .from(table)
      .delete({ count: 'exact' })
      .in('id', ids)
    if (error) {
      console.error(`[cleanup] failed to delete from ${table}: ${error.message}`)
    } else {
      console.log(`[cleanup] deleted ${count ?? ids.length} row(s) from ${table}`)
    }
  }
}

export async function cleanup({ dryRun }) {
  assertTestMode()

  const entries = listEntries()
  if (entries.length === 0) {
    console.log(`[cleanup] manifest is empty (${manifestPath()}) — nothing to clean up.`)
    return
  }

  console.log(
    `[cleanup] ${entries.length} manifest entr${entries.length === 1 ? 'y' : 'ies'} found at ${manifestPath()}` +
      (dryRun ? ' — DRY RUN, nothing will be touched.' : ' — deleting/voiding now.'),
  )

  await cleanupPaymentIntents(entries, { dryRun })
  await cleanupSignupsByPaymentIntent(entries, { dryRun })
  await cleanupRows(entries, { dryRun })

  if (dryRun) {
    console.log('[dry-run] manifest left untouched. Re-run with --confirm to actually clean up.')
    return
  }

  clearManifest()
  console.log('[cleanup] done. Manifest cleared.')
}

async function main() {
  const confirmed = process.argv.includes('--confirm')
  const dryRun = !confirmed || process.argv.includes('--dry-run')
  await cleanup({ dryRun })
}

// Guard: importing this module (e.g. from a test) never runs anything.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('[cleanup] fatal:', err.message)
    process.exitCode = 1
  })
}
