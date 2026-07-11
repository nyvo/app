// scripts/smoke/lib/manifest.mjs
//
// Read/write scripts/smoke/.manifest.json — the append-only ledger of every
// resource a smoke run creates. cleanup.mjs deletes/voids EXACTLY what's
// listed here, and nothing else. Gitignored (see .gitignore).
//
// Writes are synchronous and happen immediately on append — not batched in
// memory — so a crash mid-test never loses track of a resource that was
// actually created.

import fs from 'node:fs'
import path from 'node:path'
import { REPO_ROOT } from './env.mjs'

const MANIFEST_PATH = path.join(REPO_ROOT, 'scripts', 'smoke', '.manifest.json')

const VALID_TYPES = new Set([
  'seller',
  'course',
  'course_session',
  'signup',
  'payment_attempt',
  'payment_intent',
])

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return { entries: [] }
  try {
    const parsed = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
    if (!Array.isArray(parsed.entries)) return { entries: [] }
    return parsed
  } catch {
    // A corrupt manifest must never crash a test run — treat as empty and
    // let the next append rewrite it cleanly.
    return { entries: [] }
  }
}

function writeManifest(manifest) {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true })
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

/**
 * Record a created resource. `type` must be one of the VALID_TYPES (matches
 * what cleanup.mjs knows how to delete/void). Returns the stored entry.
 */
export function appendEntry({ type, id, stripeId, runLabel }) {
  if (!VALID_TYPES.has(type)) {
    throw new Error(`manifest.appendEntry: unknown type "${type}" (expected one of ${[...VALID_TYPES].join(', ')})`)
  }
  if (!id) {
    throw new Error('manifest.appendEntry: id is required')
  }
  const manifest = readManifest()
  const entry = {
    type,
    id,
    stripe_id: stripeId ?? null,
    createdAt: new Date().toISOString(),
    runLabel: runLabel ?? null,
  }
  manifest.entries.push(entry)
  writeManifest(manifest)
  return entry
}

export function listEntries(filter = {}) {
  const { entries } = readManifest()
  return entries.filter(
    (entry) =>
      (!filter.type || entry.type === filter.type) &&
      (!filter.runLabel || entry.runLabel === filter.runLabel),
  )
}

export function clearManifest() {
  writeManifest({ entries: [] })
}

export function manifestPath() {
  return MANIFEST_PATH
}

export { VALID_TYPES as manifestResourceTypes }
