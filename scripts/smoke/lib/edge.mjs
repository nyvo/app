// scripts/smoke/lib/edge.mjs
//
// Small fetch helper for calling deployed Supabase Edge Functions. Not one of
// the explicitly-spec'd lib files, but shared plumbing every A/E test needs —
// kept here instead of duplicated 20 times. Pure functions only; nothing
// executes on import.

import { functionsBaseUrl } from './env.mjs'

/**
 * POST/GET a deployed edge function at `${functionsBaseUrl()}/${name}`.
 * Returns { status, ok, headers, json, text } — `json` is `null` when the
 * body isn't valid JSON (some functions return plain-text error bodies).
 */
export async function callFunction(name, { method = 'POST', body, headers = {} } = {}) {
  const url = `${functionsBaseUrl()}/${name}`
  const init = { method, headers: { ...headers } }
  if (body !== undefined) {
    init.headers['Content-Type'] = init.headers['Content-Type'] ?? 'application/json'
    init.body = typeof body === 'string' ? body : JSON.stringify(body)
  }
  const res = await fetch(url, init)
  const text = await res.text()
  let json = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
  }
  return {
    status: res.status,
    ok: res.ok,
    headers: res.headers,
    json,
    text,
    url,
  }
}

export { functionsBaseUrl }
