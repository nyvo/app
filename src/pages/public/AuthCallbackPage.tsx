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
const LINK_ERROR = { title: 'Lenken virker ikke', description: 'Lenken er utløpt eller fungerer ikke.' } as const

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
  // profile state.
  useEffect(() => {
    if (error) return
    if (!isInitialized) return
    if (user) {
      navigate(resolvePostAuthDestination(profile, next, intent), { replace: true })
    } else {
      // Initialized but no user — token failed silently or wasn't present.
      setError(LINK_ERROR)
    }
  }, [isInitialized, user, profile, next, intent, error, navigate])

  if (error) {
    return (
      <AuthLayout
        title=""
        customContent
        footer={
          <p className="text-sm text-foreground-muted">
            Trenger du hjelp?{' '}
            <a href={`mailto:${COMPANY.email}`} className="font-medium text-foreground hover:underline">
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
  // session synchronously), so DelayedFallback shows nothing for the common
  // case (no full-screen-spinner flash, Studio § 10). Only a genuinely slow
  // init surfaces a centered spinner — better than an indefinite blank that's
  // indistinguishable from a crash. The navigate fires once init completes.
  return (
    <DelayedFallback>
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    </DelayedFallback>
  )
}

export default AuthCallbackPage
