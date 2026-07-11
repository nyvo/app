// scripts/smoke/lib/env.mjs
//
// Loads .env.local (repo root) + process.env for the smoke harness. Pure
// exports only — reading this module never touches the network, Stripe, or
// the DB. `assertTestMode()` is the load-bearing safety gate: every runnable
// script (run.mjs, cleanup.mjs) MUST call it before doing anything else.

import fs from 'node:fs'
import path from 'node:path'

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const ENV_FILE = path.join(REPO_ROOT, '.env.local')

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const entries = fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const idx = line.indexOf('=')
      if (idx === -1) return null
      const key = line.slice(0, idx).trim()
      const value = line
        .slice(idx + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '')
      return [key, value]
    })
    .filter((pair) => pair !== null)
  return Object.fromEntries(entries)
}

const fileEnv = parseEnvFile(ENV_FILE)

/** Read a var from process.env first, falling back to .env.local. Never throws. */
export function readVar(name) {
  const value = process.env[name]
  if (value !== undefined && value !== '') return value
  return fileEnv[name]
}

// Known vars used across the harness. Missing ones stay `undefined` here —
// individual tests/libs decide what's required and throw their own actionable
// errors (per-lib, on first use) rather than crashing at import time.
export const env = {
  VITE_SUPABASE_URL: readVar('VITE_SUPABASE_URL'),
  VITE_SUPABASE_ANON_KEY: readVar('VITE_SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: readVar('SUPABASE_SERVICE_ROLE_KEY'),
  MAILOSAUR_API_KEY: readVar('MAILOSAUR_API_KEY'),
  MAILOSAUR_SERVER_ID: readVar('MAILOSAUR_SERVER_ID'),
  VITE_STRIPE_PUBLISHABLE_KEY: readVar('VITE_STRIPE_PUBLISHABLE_KEY'),
  SMOKE_TARGET_URL: readVar('SMOKE_TARGET_URL'),
  CRON_SECRET: readVar('CRON_SECRET'),
}

/** `${VITE_SUPABASE_URL}/functions/v1`, or SMOKE_TARGET_URL when explicitly set. */
export function functionsBaseUrl() {
  const override = env.SMOKE_TARGET_URL
  if (override) return override.replace(/\/+$/, '')
  if (!env.VITE_SUPABASE_URL) {
    throw new Error(
      'Cannot derive the edge-function base URL — set SMOKE_TARGET_URL or VITE_SUPABASE_URL in .env.local',
    )
  }
  return `${env.VITE_SUPABASE_URL.replace(/\/+$/, '')}/functions/v1`
}

/**
 * HARD REFUSAL gate. Every runnable script calls this first, before anything
 * that could touch Stripe or the DB. Throws (and sets a non-zero exitCode as
 * a backstop) unless:
 *   - VITE_STRIPE_PUBLISHABLE_KEY starts with `pk_test_`, and
 *   - `--live` was not passed on the command line.
 * Never relaxable via a flag — that's the point.
 */
export function assertTestMode() {
  const key = env.VITE_STRIPE_PUBLISHABLE_KEY || ''
  if (!key.startsWith('pk_test_')) {
    const msg =
      '[smoke] REFUSING to run: VITE_STRIPE_PUBLISHABLE_KEY must start with "pk_test_" ' +
      `(got ${key ? `"${key.slice(0, 8)}…"` : 'unset'}). This harness only runs against Stripe TEST mode.`
    console.error(msg)
    process.exitCode = 1
    throw new Error(msg)
  }
  if (process.argv.includes('--live')) {
    const msg = '[smoke] REFUSING to run: --live is never accepted by this harness.'
    console.error(msg)
    process.exitCode = 1
    throw new Error(msg)
  }
}

export { REPO_ROOT }
