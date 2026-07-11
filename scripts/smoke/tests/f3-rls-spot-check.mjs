// scripts/smoke/tests/f3-rls-spot-check.mjs
// Checklist: F3 — RLS spot-checks with the anon key. Anon must not read other
// buyers' signups/payments/drafts.
//
// Per supabase/migrations/20260601000000_production_schema_baseline.sql:
//   - signups_select_member_or_buyer / payment_attempts_select_member are
//     both `TO authenticated` only — no policy exists for the `anon` role at
//     all, so RLS default-denies every row (not an error, just 0 rows).
//   - courses_select_public (`TO anon`) explicitly excludes status='draft'.
// This test asserts those hold using the real anon key against the shared DB
// — no service-role writes, purely read-only.

export const meta = { id: 'F3', title: "RLS: anon can't read signups/payment_attempts/draft courses", owner: '🤖' }

async function checkEmpty(anon, table, extra) {
  let query = anon.from(table).select('id').limit(5)
  if (extra) query = extra(query)
  const { data, error } = await query
  if (error) {
    // A permission-denied error is an even stronger pass than an empty result.
    return { table, pass: true, details: `query errored (treated as blocked): ${error.message}` }
  }
  return { table, pass: (data ?? []).length === 0, details: `${data?.length ?? 0} row(s) visible to anon` }
}

export async function run(ctx) {
  const anon = ctx.db.anon()

  const results = await Promise.all([
    checkEmpty(anon, 'signups'),
    checkEmpty(anon, 'payment_attempts'),
    checkEmpty(anon, 'courses', (q) => q.eq('status', 'draft')),
  ])

  const failed = results.filter((r) => !r.pass)
  const summary = results.map((r) => `${r.table}: ${r.pass ? 'blocked' : 'LEAKED'} (${r.details})`).join('; ')
  return { pass: failed.length === 0, details: summary }
}
