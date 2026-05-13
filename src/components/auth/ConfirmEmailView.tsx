import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import { AUTH_ERRORS, AUTH_HINTS } from '@/lib/auth-messages'

export const ConfirmEmailView = () => {
  const location = useLocation()
  const email = (location.state as { email?: string })?.email ?? null
  const [isResending, setIsResending] = useState(false)

  const handleResend = async () => {
    if (!email) return

    setIsResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (error) {
        toast.error(AUTH_ERRORS.resendFailed, {
          description: error.message,
        })
      } else {
        toast.success('E-post sendt på nytt', {
          description: 'Sjekk innboksen din.',
        })
      }
    } catch {
      toast.error(AUTH_ERRORS.generic)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AuthLayout title="" customContent>
      <div className="text-center mb-8 space-y-2 w-full">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Sjekk e-posten din
        </h1>
        <p className="text-sm text-foreground-muted">
          {email ? (
            <>
              Vi har sendt en bekreftelseslenke til{' '}
              <span className="text-foreground">{email}</span>.
              Du må bekrefte e-posten før du kan logge inn.
            </>
          ) : (
            'Vi har sendt en bekreftelseslenke til e-posten din. Du må bekrefte før du kan logge inn.'
          )}
        </p>
      </div>

      <div className="w-full space-y-3">
        {email && (
          <Button
            onClick={handleResend}
            loading={isResending}
            loadingText="Sender"
            variant="outline-soft"
            size="cta" className="w-full"
          >
            Send på nytt
          </Button>
        )}

        <Button asChild size="cta" className="w-full">
          <Link to={AUTH_ROUTES.login}>Logg inn</Link>
        </Button>
      </div>

      <p className="text-xs mt-6 text-center text-foreground-muted">
        {AUTH_HINTS.checkSpamAlt}
      </p>
    </AuthLayout>
  )
}
