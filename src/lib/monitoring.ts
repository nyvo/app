import * as Sentry from '@sentry/react'

// Error monitoring is entirely gated on VITE_SENTRY_DSN. With no DSN — local dev,
// or a deploy that hasn't set the secret — every export below is a silent no-op
// (no network, no overhead), so callers can invoke them unconditionally.
const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined

/** Whether a DSN is configured for this build (error reporting is live). */
export const isMonitoringEnabled = Boolean(dsn)

/** Initialise Sentry once, at app start (main.tsx). No-op without a DSN. */
export function initMonitoring(): void {
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Errors only for now — no performance tracing or session replay until we
    // decide we want the volume/cost. sendDefaultPii stays off (GDPR: this is a
    // consumer app, so don't ship IPs/cookies to a third party by default).
    tracesSampleRate: 0,
    sendDefaultPii: false,
  })
}

/**
 * Report an exception with optional structured context. Used by the app's
 * ErrorBoundary. No-op without a DSN.
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!dsn) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}

/**
 * Forward a `logger.error(...)` call to Sentry. Picks the first Error in the args
 * as the exception; otherwise sends the stringified args as an error-level
 * message. No-op without a DSN.
 */
export function reportErrorLog(args: unknown[]): void {
  if (!dsn) return
  const err = args.find((a): a is Error => a instanceof Error)
  if (err) {
    const details = args.filter((a) => a !== err)
    Sentry.captureException(err, details.length ? { extra: { details } } : undefined)
    return
  }
  const message = args.map(stringifyArg).join(' ').trim()
  if (message) Sentry.captureMessage(message, 'error')
}

function stringifyArg(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
