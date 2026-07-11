// scripts/smoke/tests/f6-email-dns.mjs
// Checklist: F6 — Email DNS (SPF/DKIM/DMARC) via `dig`. Read-only DNS lookups,
// no side effects whatsoever.
//
// Domain defaults to 'openspot.no' (per PRELAUNCH.md / docs/launch-readiness.md
// — DMARC already exists at _dmarc.openspot.no); override with SMOKE_DNS_DOMAIN.
// DKIM selector isn't documented in-repo — Resend's default selector is
// `resend._domainkey`; override with SMOKE_DKIM_SELECTOR if the account uses
// a different one. A missing/unresolvable DKIM record is reported but doesn't
// fail the whole test on its own (selector guesses can be wrong); SPF and
// DMARC are hard requirements.

import { spawnSync } from 'node:child_process'
import { readVar } from '../lib/env.mjs'

export const meta = { id: 'F6', title: 'Email sending domain has SPF + DKIM + DMARC records', owner: '🤖' }

function digTxt(name) {
  const result = spawnSync('dig', ['+short', 'TXT', name], { encoding: 'utf8', timeout: 15_000 })
  if (result.error) throw new Error(`dig failed to run (is it installed?): ${result.error.message}`)
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export async function run(ctx) {
  const domain = ctx.fixtures.dnsDomain()
  const dkimSelector = readVar('SMOKE_DKIM_SELECTOR') || 'resend._domainkey'

  const spfRecords = digTxt(domain)
  const spf = spfRecords.find((r) => r.toLowerCase().includes('v=spf1'))

  const dmarcRecords = digTxt(`_dmarc.${domain}`)
  const dmarc = dmarcRecords.find((r) => r.toLowerCase().includes('v=dmarc1'))

  const dkimRecords = digTxt(`${dkimSelector}.${domain}`)
  const dkim = dkimRecords.find((r) => r.toLowerCase().includes('v=dkim1') || r.toLowerCase().includes('k=rsa'))

  const checks = [
    { name: 'SPF', pass: !!spf, details: spf ?? `no v=spf1 TXT record at ${domain}` },
    { name: 'DMARC', pass: !!dmarc, details: dmarc ?? `no v=DMARC1 TXT record at _dmarc.${domain}` },
    {
      name: 'DKIM',
      pass: !!dkim,
      details: dkim ?? `no DKIM TXT record at ${dkimSelector}.${domain} (selector may differ — set SMOKE_DKIM_SELECTOR)`,
      soft: true,
    },
  ]

  const hardFailed = checks.filter((c) => !c.pass && !c.soft)
  const summary = checks.map((c) => `${c.name}: ${c.pass ? 'ok' : c.soft ? 'WARN' : 'FAIL'} — ${c.details}`).join(' | ')
  return { pass: hardFailed.length === 0, details: summary }
}
