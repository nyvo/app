// scripts/smoke/lib/context.mjs
//
// Assembles the shared `ctx` object passed to every test's `run(ctx)`. Built
// once per run.mjs invocation — nothing here executes on import.

import { env, functionsBaseUrl } from './env.mjs'
import { getServiceClient, getAnonClient } from './db.mjs'
import { appendEntry, listEntries } from './manifest.mjs'
import { mintAddress, waitForMessage, countMessages } from './mailosaur.mjs'
import * as stripeCli from './stripe-cli.mjs'
import { callFunction } from './edge.mjs'
import { fixtures, sellerOwnerAuthHeader, FixtureError } from './fixtures.mjs'

export function buildContext({ runLabel }) {
  // Seed the Mailosaur address counter from the manifest so addresses stay
  // greppable/deterministic-ish across a run without relying on Math.random()
  // or Date.now() (per the harness spec — counters come from the manifest).
  let mailosaurCounter = listEntries().length

  return {
    env,
    runLabel,
    functionsBaseUrl,
    callFunction,
    db: {
      service: getServiceClient,
      anon: getAnonClient,
    },
    manifest: {
      record: (type, id, stripeId) => appendEntry({ type, id, stripeId, runLabel }),
    },
    mailosaur: {
      mint: (label) => mintAddress(label, ++mailosaurCounter),
      waitForMessage,
      countMessages,
    },
    stripeCli,
    fixtures,
    sellerOwnerAuthHeader,
    FixtureError,
    /**
     * Auth headers for cron-only edge functions (sweep-pending-payments,
     * ops-health-alert, send-class-reminders, send-pending-confirmations).
     * Prefers CRON_SECRET (x-cron-secret) since that's the real production
     * cron credential; falls back to the service-role bearer (also accepted
     * by every cron function). Throws if neither is configured.
     */
    cronAuthHeaders() {
      if (env.CRON_SECRET) return { 'x-cron-secret': env.CRON_SECRET }
      if (env.SUPABASE_SERVICE_ROLE_KEY) return { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }
      throw new Error(
        'Neither CRON_SECRET nor SUPABASE_SERVICE_ROLE_KEY is set in .env.local — needed to call cron-only edge functions',
      )
    },
  }
}
