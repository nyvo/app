import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import { AUTH_ERRORS, AUTH_HINTS } from '@/lib/auth-messages'

const ROUTES = AUTH_ROUTES.teacher

const ConfirmEmailPage = () => {
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
    <AuthLayout context="teacher" title="" customContent>
      <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-6">
        <Mail className="size-5 text-muted-foreground" />
      </div>

      <h1 className="font-geist text-2xl font-medium tracking-tight text-foreground mb-2">
        Sjekk e-posten din
      </h1>

      <p className="text-muted-foreground text-sm leading-relaxed mb-8 text-center">
        {email ? (
          <>
            Vi har sendt en bekreftelseslenke til{' '}
            <span className="font-medium text-foreground">{email}</span>.
            Du må bekrefte e-posten før du kan logge inn.
          </>
        ) : (
          'Vi har sendt en bekreftelseslenke til e-posten din. Du må bekrefte før du kan logge inn.'
        )}
      </p>

      <div className="w-full space-y-3">
        {email && (
          <Button
            onClick={handleResend}
            loading={isResending}
            loadingText="Sender"
            variant="outline-soft"
            className="w-full h-11"
          >
            Send på nytt
          </Button>
        )}

        <Button asChild className="w-full h-11">
          <Link to={ROUTES.login}>Logg inn</Link>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-6 text-center">
        {AUTH_HINTS.checkSpamAlt}
      </p>
    </AuthLayout>
  )
}

export default ConfirmEmailPage
