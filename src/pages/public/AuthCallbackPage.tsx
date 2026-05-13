import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
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
  // when the magic-link token is expired or already redeemed.
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('error_description=')) {
      const params = new URLSearchParams(hash.replace(/^#/, ''))
      const desc = params.get('error_description')
      setErrorMessage(desc ? desc.replace(/\+/g, ' ') : 'Lenken er utløpt eller fungerer ikke.')
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
      <AuthLayout title="" customContent>
        <div className="w-full space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground max-w-md">
            Ugyldig lenke
          </h1>
          <p className="text-sm text-foreground-muted max-w-md">
            {errorMessage}
          </p>
        </div>

        <div className="mt-7 w-full">
          <Button asChild size="cta" className="w-full">
            <Link to={AUTH_ROUTES.login}>Tilbake til innlogging</Link>
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Logger inn"
      className="min-h-screen w-full bg-background text-foreground antialiased flex items-center justify-center"
    >
      <Spinner size="xl" />
    </div>
  )
}

export default AuthCallbackPage
