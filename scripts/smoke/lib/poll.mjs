// scripts/smoke/lib/poll.mjs
//
// Tiny polling helper shared by the money-path tests: webhook-driven state
// (payment_attempts.status, signups.status) settles asynchronously, so tests
// poll the DB rather than assuming it's synchronous. Not one of the
// explicitly-spec'd lib files, but trivial shared plumbing. Nothing executes
// on import.

/**
 * Poll `check()` until it returns a truthy value or `timeoutMs` elapses.
 * Returns the truthy value, or throws with `label` on timeout.
 */
export async function pollUntil(check, { timeoutMs = 30_000, intervalMs = 2_000, label = 'condition' } = {}) {
  const deadline = Date.now() + timeoutMs
  let last
  while (Date.now() < deadline) {
    last = await check()
    if (last) return last
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for: ${label} (last value: ${JSON.stringify(last)})`)
}
