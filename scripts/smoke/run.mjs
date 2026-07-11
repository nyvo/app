#!/usr/bin/env node
// scripts/smoke/run.mjs
//
// The single entry point for the launch smoke-test harness. Lists every
// available test grouped by checklist section; WITHOUT --confirm it only
// PRINTS the plan and exits 0 — this is the guard against accidental
// execution. Nothing in this file (or any test module it imports) runs a
// side-effecting call before --confirm is seen.
//
//   node scripts/smoke/run.mjs                    # print the plan, do nothing
//   node scripts/smoke/run.mjs --confirm           # run everything
//   node scripts/smoke/run.mjs --confirm --only=A2,A3,E1   # run a subset
//
// After a --confirm run, ALWAYS follow up with:
//   node scripts/smoke/cleanup.mjs --confirm
// (test rows land in the shared Supabase DB — see docs/smoke-test-checklist.md).

import { assertTestMode } from './lib/env.mjs'
import { buildContext } from './lib/context.mjs'
import { FixtureError } from './lib/fixtures.mjs'

import * as a1 from './tests/a1-happy-path.mjs'
import * as a2 from './tests/a2-declined-card.mjs'
import * as a3 from './tests/a3-free-signup.mjs'
import * as a4 from './tests/a4-oversell-race.mjs'
import * as a5 from './tests/a5-blocked-states.mjs'
import * as a6 from './tests/a6-double-submit.mjs'
import * as a7 from './tests/a7-webhook-idempotency.mjs'
import * as a8 from './tests/a8-pending-sweep.mjs'
import * as a9 from './tests/a9-teacher-cancel-refund.mjs'
import * as a10 from './tests/a10-cancel-course-refund.mjs'
import * as a11 from './tests/a11-refund-preserves-cancelled.mjs'
import * as a12 from './tests/a12-price-tampering.mjs'
import * as e1 from './tests/e1-jwt-gated-401.mjs'
import * as e2 from './tests/e2-cron-401.mjs'
import * as e3 from './tests/e3-webhook-bad-signature.mjs'
import * as e4 from './tests/e4-rate-limit.mjs'
import * as e5 from './tests/e5-send-email-not-open-relay.mjs'
import * as e6 from './tests/e6-cors-preflight.mjs'
import * as f1 from './tests/f1-migration-drift.mjs'
import * as f3 from './tests/f3-rls-spot-check.mjs'
import * as f6 from './tests/f6-email-dns.mjs'

// Registry order = run order = plan-print order. E4 is placed last within its
// section on purpose (see its own header comment — it burns the shared IP
// rate-limit bucket that the A-section money tests also depend on).
const REGISTRY = [
  a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12,
  e1, e2, e3, e5, e6, e4,
  f1, f3, f6,
]

function parseArgs(argv) {
  const confirm = argv.includes('--confirm')
  const onlyArg = argv.find((a) => a.startsWith('--only='))
  const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').map((s) => s.trim().toUpperCase())) : null
  return { confirm, only }
}

function printPlan(tests) {
  console.log('[smoke] PLAN — nothing has been executed. Pass --confirm to actually run these:\n')
  let section = null
  for (const { meta } of tests) {
    const currentSection = meta.id.replace(/[0-9].*$/, '')
    if (currentSection !== section) {
      section = currentSection
      console.log(`  Section ${section}`)
    }
    console.log(`    ${meta.id.padEnd(4)} ${meta.owner}  ${meta.title}`)
  }
  console.log(`\n[smoke] ${tests.length} test(s) registered. Run with --confirm to execute (optionally --only=A2,A3).`)
  console.log('[smoke] Remember: node scripts/smoke/cleanup.mjs --confirm after a real run — test rows land in the shared DB.')
}

async function runTests(tests, runLabel) {
  const ctx = buildContext({ runLabel })
  const results = []
  for (const { meta, run } of tests) {
    process.stdout.write(`[smoke] ${meta.id} ${meta.title} ... `)
    const start = Date.now()
    let outcome
    try {
      outcome = await run(ctx)
    } catch (err) {
      if (err instanceof FixtureError) {
        outcome = { skipped: true, details: err.message }
      } else {
        outcome = { pass: false, details: `${err.message}${err.stack ? `\n${err.stack.split('\n').slice(1, 4).join('\n')}` : ''}` }
      }
    }
    const ms = Date.now() - start
    const label = outcome.skipped ? 'SKIP' : outcome.pass ? 'PASS' : 'FAIL'
    console.log(`${label} (${ms}ms)`)
    if (outcome.details) console.log(`         ${outcome.details}`)
    results.push({ id: meta.id, title: meta.title, ...outcome, ms })
  }
  return results
}

function printSummary(results) {
  console.log('\n[smoke] ================= SUMMARY =================')
  const pass = results.filter((r) => !r.skipped && r.pass)
  const fail = results.filter((r) => !r.skipped && !r.pass)
  const skip = results.filter((r) => r.skipped)
  for (const r of results) {
    const label = r.skipped ? 'SKIP' : r.pass ? 'PASS' : 'FAIL'
    console.log(`  ${label.padEnd(4)} ${r.id.padEnd(4)} ${r.title}`)
  }
  console.log(`\n[smoke] ${pass.length} passed, ${fail.length} failed, ${skip.length} skipped (of ${results.length}).`)
  if (fail.length > 0) {
    console.log('\n[smoke] FAILED:')
    for (const r of fail) console.log(`  - ${r.id}: ${r.details}`)
  }
  if (skip.length > 0) {
    console.log('\n[smoke] SKIPPED (unset fixtures — see scripts/smoke/README.md#fixtures):')
    for (const r of skip) console.log(`  - ${r.id}: ${r.details}`)
  }
  console.log('\n[smoke] Now run: node scripts/smoke/cleanup.mjs --confirm')
  return fail.length === 0
}

async function main() {
  assertTestMode()

  const { confirm, only } = parseArgs(process.argv.slice(2))
  const tests = only ? REGISTRY.filter((t) => only.has(t.meta.id.toUpperCase())) : REGISTRY

  if (!confirm) {
    printPlan(tests)
    return
  }

  const runLabel = new Date().toISOString().replace(/[:.]/g, '-')
  console.log(`[smoke] RUNNING ${tests.length} test(s) — runLabel=${runLabel}\n`)
  const results = await runTests(tests, runLabel)
  const ok = printSummary(results)
  process.exitCode = ok ? 0 : 1
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('[smoke] fatal:', err.message)
    process.exitCode = 1
  })
}
