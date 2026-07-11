// scripts/smoke/tests/e6-cors-preflight.mjs
// Checklist: E6 — CORS allowed-origins only + preflight. curl OPTIONS.
//
// Exercises _shared/auth.ts getCorsHeaders(): an allowed origin (localhost —
// always accepted regardless of ALLOWED_ORIGIN, per LOCAL_DEV_ORIGIN_PATTERN)
// must be echoed back in Access-Control-Allow-Origin; a random untrusted
// origin must NOT be echoed (it falls back to the whitelist's first entry).

import { callFunction } from '../lib/edge.mjs'

export const meta = { id: 'E6', title: 'CORS preflight: allowed origins echoed, untrusted origins rejected', owner: '🤖' }

// verify_jwt=false and CORS-enabled — a representative public function.
const TARGET_FUNCTION = 'create-free-signup'
const EVIL_ORIGIN = 'https://evil-attacker.example.com'
const LOCAL_DEV_ORIGIN = 'http://localhost:5173'

export async function run(_ctx) {
  const evilRes = await callFunction(TARGET_FUNCTION, { method: 'OPTIONS', headers: { Origin: EVIL_ORIGIN } })
  const evilAllowOrigin = evilRes.headers.get('access-control-allow-origin')

  const localRes = await callFunction(TARGET_FUNCTION, { method: 'OPTIONS', headers: { Origin: LOCAL_DEV_ORIGIN } })
  const localAllowOrigin = localRes.headers.get('access-control-allow-origin')

  const checks = [
    {
      name: 'evil origin not echoed',
      pass: evilAllowOrigin !== EVIL_ORIGIN,
      details: `Access-Control-Allow-Origin='${evilAllowOrigin}' (must NOT equal '${EVIL_ORIGIN}')`,
    },
    {
      name: 'localhost dev origin echoed',
      pass: localAllowOrigin === LOCAL_DEV_ORIGIN,
      details: `Access-Control-Allow-Origin='${localAllowOrigin}' (expected '${LOCAL_DEV_ORIGIN}')`,
    },
    {
      name: 'preflight status is 2xx',
      pass: evilRes.status >= 200 && evilRes.status < 300 && localRes.status >= 200 && localRes.status < 300,
      details: `evil OPTIONS=${evilRes.status}, local OPTIONS=${localRes.status}`,
    },
    {
      name: 'Allow-Methods present',
      pass: !!evilRes.headers.get('access-control-allow-methods'),
      details: `Access-Control-Allow-Methods='${evilRes.headers.get('access-control-allow-methods')}'`,
    },
  ]
  const failed = checks.filter((c) => !c.pass)
  const summary = checks.map((c) => `${c.name}: ${c.pass ? 'ok' : 'FAIL'} (${c.details})`).join('; ')
  return { pass: failed.length === 0, details: summary }
}
