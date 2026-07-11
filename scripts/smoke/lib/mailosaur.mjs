// scripts/smoke/lib/mailosaur.mjs
//
// Thin wrapper over the Mailosaur REST API (https://mailosaur.com/docs/api).
// Auth is HTTP Basic with the API key as the username and an empty password.
// Nothing here executes on import.

import { env } from './env.mjs'

const MAILOSAUR_BASE = 'https://mailosaur.com/api'

function requireConfig() {
  if (!env.MAILOSAUR_API_KEY || !env.MAILOSAUR_SERVER_ID) {
    throw new Error('MAILOSAUR_API_KEY / MAILOSAUR_SERVER_ID not set in .env.local')
  }
}

function authHeader() {
  requireConfig()
  const token = Buffer.from(`${env.MAILOSAUR_API_KEY}:`).toString('base64')
  return `Basic ${token}`
}

/**
 * Deterministic-ish, greppable inbox address: smoke-<label>-<counter>@<server>.mailosaur.net.
 * `counter` should come from the caller (e.g. a manifest-backed run counter), NOT
 * Math.random()/Date.now(), so re-running the same test id is easy to find in the inbox.
 */
export function mintAddress(label, counter) {
  requireConfig()
  const safeLabel = String(label)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'test'
  return `smoke-${safeLabel}-${counter}@${env.MAILOSAUR_SERVER_ID}.mailosaur.net`
}

async function mailosaurFetch(path, init = {}) {
  const res = await fetch(`${MAILOSAUR_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  return res
}

/** Fetch full message detail (body/links) by Mailosaur message id. */
async function getMessage(id) {
  const res = await mailosaurFetch(`/messages/${id}`)
  if (!res.ok) {
    throw new Error(`Mailosaur GET /messages/${id} failed: ${res.status} ${await res.text()}`)
  }
  return res.json()
}

function extractLinks(detail) {
  const textLinks = detail.text?.links ?? []
  const htmlLinks = detail.html?.links ?? []
  return [...textLinks, ...htmlLinks].map((link) => link.href).filter(Boolean)
}

/**
 * Poll Mailosaur's search endpoint for a message sent to `sentTo`, within
 * `timeoutMs`. Returns { id, subject, text, html, links }. Throws on timeout.
 */
export async function waitForMessage({ sentTo, timeoutMs = 30_000, pollIntervalMs = 2_000 } = {}) {
  requireConfig()
  if (!sentTo) throw new Error('waitForMessage: sentTo is required')

  const deadline = Date.now() + timeoutMs
  let lastError = null

  while (Date.now() < deadline) {
    try {
      const res = await mailosaurFetch(`/messages/search?server=${env.MAILOSAUR_SERVER_ID}`, {
        method: 'POST',
        body: JSON.stringify({ sentTo }),
      })
      if (res.ok) {
        const data = await res.json()
        const first = data.items?.[0]
        if (first) {
          const detail = await getMessage(first.id)
          return {
            id: detail.id,
            subject: detail.subject ?? '',
            text: detail.text?.body ?? '',
            html: detail.html?.body ?? '',
            links: extractLinks(detail),
          }
        }
      } else if (res.status !== 404) {
        lastError = new Error(`Mailosaur search failed: ${res.status} ${await res.text()}`)
      }
    } catch (err) {
      lastError = err
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw lastError ?? new Error(`No Mailosaur message arrived for ${sentTo} within ${timeoutMs}ms`)
}

/**
 * Count messages sent to `sentTo` right now (no polling/waiting) — used to
 * assert an EXACT count (e.g. "exactly 1 email, not 2") rather than just
 * presence. Returns 0 on a 404 (no messages yet).
 */
export async function countMessages({ sentTo }) {
  requireConfig()
  if (!sentTo) throw new Error('countMessages: sentTo is required')
  const res = await mailosaurFetch(`/messages/search?server=${env.MAILOSAUR_SERVER_ID}`, {
    method: 'POST',
    body: JSON.stringify({ sentTo }),
  })
  if (res.status === 404) return 0
  if (!res.ok) throw new Error(`Mailosaur search failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.items?.length ?? 0
}

/** Best-effort cleanup of a fetched message (not manifest-tracked — Mailosaur inboxes self-expire). */
export async function deleteMessage(id) {
  try {
    await mailosaurFetch(`/messages/${id}`, { method: 'DELETE' })
  } catch {
    // Non-fatal — Mailosaur test-server messages expire on their own.
  }
}
