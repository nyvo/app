import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { DelayedFallback } from '@/components/ui/delayed-fallback'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { useAuth } from '@/contexts/AuthContext'
import {
  AUTH_ROUTES,
  parseAuthIntent,
  resolvePostAuthDestination,
  sanitizeNextPath,
} from '@/lib/auth-routes'
import { COMPANY } from '@/lib/company'

// The generic "link failed" error (expired / already redeemed / silently
// absent token). Cancellation of an OAuth consent is a distinct, non-error
// case handled separately below.
const LINK_ERROR = { title: 'Lenken virker ikke', description: 'Den er utløpt eller allerede brukt.' } as const

// How long a session may take to materialize after auth init reports "no
// user" before we declare the link dead. The PKCE exchange normally lands
// well under a second; this only delays the error screen for genuinely
// dead links, never the happy path.
const LINK_ERROR_GRACE_MS = 5000

/**
 * Magic-link / OAuth callback handler.
 *
 * Supabase client is configured with `detectSessionInUrl: true`, so it
 * parses the hash fragment (#access_token=...) and establishes the session
 * automatically. This page waits for AuthContext to finalize, then routes
 * the user to the dashboard. If the link contains an error
 * (expired / already used), we surface it instead of bouncing silently.
 *
 * Spec: studio-design § 21.4 (magic link flow).
 */
const AuthCallbackPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, profile, isInitialized } = useAuth()
  const [error, setError] = useState<{ title: string; description: string | null } | null>(null)

  // Parse the error on mount — Supabase appends `error`/`error_description`
  // when the token is expired, already redeemed, or the user cancelled the
  // OAuth consent. With PKCE they arrive as query params; the legacy implicit
  // flow put them in the hash. The raw value is English-only, so we render our
  // own localized copy.
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const queryParams = new URLSearchParams(window.location.search)
    const errorParam = hashParams.get('error') ?? queryParams.get('error')
    const errorCode = hashParams.get('error_code') ?? queryParams.get('error_code')
    const errorDescription = hashParams.get('error_description') ?? queryParams.get('error_description')
    if (errorParam || errorCode || errorDescription) {
      const desc = errorDescription?.toLowerCase() ?? ''
      // Expired/redeemed magic links ALSO surface as access_denied (with
      // error_code=otp_expired), so those signals win — only a genuine consent
      // cancellation reads as "avbrutt".
      const isExpiredLink = errorCode === 'otp_expired' || desc.includes('expired') || desc.includes('invalid')
      const cancelled = !isExpiredLink && (errorParam === 'access_denied' || desc.includes('cancel') || desc.includes('denied'))
      setError(
        cancelled
          ? { title: 'Innloggingen ble avbrutt', description: null }
          : LINK_ERROR,
      )
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // `?next=` preserves a deep-link target from before login; `?intent=`
  // carries the entry-context role so onboarding can skip the role chooser.
  // Both rode the provider redirect URL set by AuthPage. Extracted as
  // primitives — `searchParams` gets a fresh object identity per render,
  // which would re-trigger the effect needlessly.
  const next = sanitizeNextPath(searchParams.get('next')) ?? AUTH_ROUTES.dashboard
  const intent = parseAuthIntent(searchParams.get('intent'))

  // Once auth has initialized, resolve the right destination from the
  // profile state. A momentary "initialized but no user" reading is NOT
  // proof of a dead link: on a PKCE callback the code exchange, the
  // SIGNED_IN event and this context state race on a fresh page load
  // (prod logs showed exchanges succeeding server-side while this page
  // declared failure). So: navigate the moment a session + profile exist —
  // even over an already-rendered error — and only conclude failure after
  // a grace window with no session. Explicit provider errors (effect above)
  // still render immediately.
  useEffect(() => {
    if (!isInitialized) return
    if (user && profile) {
      navigate(resolvePostAuthDestination(profile, next, intent), { replace: true })
      return
    }
    if (error || user) return // error already shown, or profile still loading
    const timer = window.setTimeout(() => setError(LINK_ERROR), LINK_ERROR_GRACE_MS)
    return () => window.clearTimeout(timer)
  }, [isInitialized, user, profile, next, intent, error, navigate])

  if (error) {
    return (
      <AuthLayout
        title=""
        customContent
        footer={
          <p className="text-sm text-foreground-muted">
            Trenger du hjelp?{' '}
            <a href={`mailto:${COMPANY.email}`} className="text-primary underline underline-offset-2 hover:decoration-2">
              {COMPANY.email}
            </a>
          </p>
        }
      >
        <div className="mb-8 w-full space-y-2 text-center">
          <h1 className="text-2xl font-medium text-foreground">
            {error.title}
          </h1>
          {error.description && (
            <p className="text-sm text-foreground-muted">
              {error.description}
            </p>
          )}
        </div>

        <div className="w-full">
          <Button asChild size="lg" className="w-full">
            <Link to={AUTH_ROUTES.auth}>Tilbake til innlogging</Link>
          </Button>
        </div>
      </AuthLayout>
    )
  }

  // Callback resolution is fast (Supabase parses the URL hash and writes the
  // session synchronously) — DelayedFallback holds the spinner back for
  // 300ms so the common case doesn't flash it (Studio § 10). On the rare
  // slow init the spinner appears; the navigate fires as soon as
  // `isInitialized` flips true.
  return (
    <DelayedFallback delayMs={300}>
      <AuthLayout title="" customContent>
        <div className="flex w-full flex-1 items-center justify-center">
          <Spinner size="lg" />
        </div>
      </AuthLayout>
    </DelayedFallback>
  )
}

export default AuthCallbackPage
