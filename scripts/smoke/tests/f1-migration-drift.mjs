// scripts/smoke/tests/f1-migration-drift.mjs
// Checklist: F1 — Migration drift zero. Shells out to `supabase migration
// list`, which compares supabase/migrations/*.sql against the linked remote
// project's migration history table. Requires the Supabase CLI to already be
// linked (this repo's CLAUDE.md documents the drift-recovery process — see
// "Database Migrations" — if this test fails, follow that, don't hand-edit).
//
// Two distinct kinds of asymmetry, both reported:
//   - Remote populated, Local blank → DANGEROUS: applied to the DB but the
//     .sql file never landed in the repo (see CLAUDE.md — recover the file
//     from a Conductor checkpoint ref and commit it to main).
//   - Local populated, Remote blank → a committed migration not yet applied
//     to the remote DB (`supabase db push` from a workspace, then make sure
//     it reaches main).

import { spawnSync } from 'node:child_process'

export const meta = { id: 'F1', title: 'Migration drift zero (supabase migration list)', owner: '🤖' }

function parseMigrationListTable(output) {
  const rows = []
  for (const line of output.split(/\r?\n/)) {
    if (!line.includes('|')) continue
    if (/^\s*-+\s*\|/.test(line)) continue // separator row
    if (/Local\s*\|\s*Remote/.test(line)) continue // header row
    const cells = line.split('|').map((c) => c.trim())
    if (cells.length < 2) continue
    const [local, remote] = cells
    if (!local && !remote) continue
    rows.push({ local: local || null, remote: remote || null })
  }
  return rows
}

export async function run(_ctx) {
  const result = spawnSync('npx', ['supabase', 'migration', 'list'], { encoding: 'utf8', timeout: 60_000 })
  if (result.error) {
    return { pass: false, details: `Failed to run \`supabase migration list\`: ${result.error.message}` }
  }
  const output = `${result.stdout}\n${result.stderr}`
  if (result.status !== 0) {
    return { pass: false, details: `\`supabase migration list\` exited ${result.status}: ${output.slice(0, 800)}` }
  }

  const rows = parseMigrationListTable(output)
  if (rows.length === 0) {
    return { pass: false, details: `Could not parse any migration rows from output:\n${output.slice(0, 800)}` }
  }

  const remoteOnly = rows.filter((r) => r.remote && !r.local)
  const localOnly = rows.filter((r) => r.local && !r.remote)

  if (remoteOnly.length === 0 && localOnly.length === 0) {
    return { pass: true, details: `${rows.length} migrations, local and remote in sync.` }
  }

  const parts = []
  if (remoteOnly.length > 0) {
    parts.push(
      `${remoteOnly.length} REMOTE-ONLY (dangerous — applied to DB but file missing from repo, recover per CLAUDE.md): ${remoteOnly.map((r) => r.remote).join(', ')}`,
    )
  }
  if (localOnly.length > 0) {
    parts.push(`${localOnly.length} local-only (committed, not yet applied to remote — needs \`supabase db push\`): ${localOnly.map((r) => r.local).join(', ')}`)
  }
  return { pass: false, details: parts.join(' | ') }
}
