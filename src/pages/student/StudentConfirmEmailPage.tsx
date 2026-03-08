import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import { AUTH_ERRORS, AUTH_HINTS } from '@/lib/auth-messages'

const ROUTES = AUTH_ROUTES.student

const StudentConfirmEmailPage = () => {
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
    <AuthLayout context="student" title="" customContent>
      <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-6">
        <Mail className="w-5 h-5 text-text-secondary" />
      </div>

      <h1 className="text-2xl font-medium tracking-tight text-text-primary mb-2">
        Sjekk e-posten din
      </h1>

      <p className="text-text-secondary text-sm leading-relaxed mb-8 text-center">
        {email ? (
          <>
            Vi har sendt en bekreftelseslenke til{' '}
            <span className="font-medium text-text-primary">{email}</span>.
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
            Send bekreftelse på nytt
          </Button>
        )}

        <Button asChild className="w-full h-11">
          <Link to={ROUTES.login}>Logg inn</Link>
        </Button>
      </div>

      <p className="text-xs text-text-secondary mt-6 text-center">
        {AUTH_HINTS.checkSpamAlt}
      </p>
    </AuthLayout>
  )
}

export default StudentConfirmEmailPage
