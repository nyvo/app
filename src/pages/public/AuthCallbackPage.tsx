import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { useAuth } from '@/contexts/AuthContext'
import { AUTH_ROUTES } from '@/lib/auth-routes'

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
  const { user, isInitialized } = useAuth()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Parse `error_description` from the hash on mount — Supabase appends it
  // when the magic-link token is expired or already redeemed. The raw value
  // is English-only, so we always render our own localized fallback.
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('error_description=')) {
      setErrorMessage('Lenken er utløpt eller fungerer ikke.')
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // Once auth has initialized and we have a user, route to dashboard.
  useEffect(() => {
    if (errorMessage) return
    if (!isInitialized) return
    if (user) {
      navigate(AUTH_ROUTES.dashboard, { replace: true })
    } else {
      // Initialized but no user — token failed silently or wasn't present.
      setErrorMessage('Lenken er utløpt eller fungerer ikke.')
    }
  }, [isInitialized, user, errorMessage, navigate])

  if (errorMessage) {
    return (
      <AuthLayout
        title=""
        customContent
        footer={
          <p className="text-sm text-foreground-muted">
            Trenger du hjelp?{' '}
            <a href="mailto:hei@openspot.no" className="font-medium text-foreground hover:underline">
              hei@openspot.no
            </a>
          </p>
        }
      >
        <div className="mb-8 w-full space-y-2 text-center">
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Ugyldig lenke
          </h1>
          <p className="text-sm text-foreground-muted">
            {errorMessage}
          </p>
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
  // session synchronously). Rendering nothing avoids the full-screen-spinner
  // flash (Studio § 10). On the rare slow init the user briefly sees blank
  // — the navigate fires as soon as `isInitialized` flips true.
  return null
}

export default AuthCallbackPage
