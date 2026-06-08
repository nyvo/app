import { Link, useNavigate, useLocation, type Location } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { useAuth } from '@/contexts/AuthContext'
import { useFormValidation } from '@/hooks/use-form-validation'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthFormField } from '@/components/auth/AuthFormField'
import { AUTH_ROUTES, resolvePostAuthDestination } from '@/lib/auth-routes'
import { AUTH_VALIDATION, AUTH_ERRORS, AUTH_PLACEHOLDERS } from '@/lib/auth-messages'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import { isValidEmail } from '@/lib/utils'
import { toast } from 'sonner'

const ROUTES = AUTH_ROUTES

/**
 * Combined sign-in / sign-up surface (§ 21.1 / 21.2).
 *
 * Magic-link only — Supabase's `signInWithOtp` creates the account on first
 * link click if the email isn't registered, signs in if it is. The email
 * contains both a magic link AND a 6-digit OTP code; users can either click
 * the link or type the code on this page. Role selection happens at
 * /onboarding after the callback (§ 21.3a). No password fallback, no
 * forgot-password flow — Linear / Substack pattern.
 */
const AuthPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { sendMagicLink, user, profile, isLoading: authLoading } = useAuth()

  const locationState = location.state as { email?: string; from?: Location } | null
  const prefillEmail = locationState?.email ?? ''
  const redirectAfterLogin = locationState?.from?.pathname ?? ROUTES.dashboard
  // Provider-side redirect (magic link / OAuth) must come back through the
  // callback so the post-auth gate runs once, with `next` preserving the
  // deep-link target if there was one.
  const callbackUrl = `${window.location.origin}${ROUTES.callback}?next=${encodeURIComponent(redirectAfterLogin)}`

  // Two-step: identify (enter email) → sent (enter OTP / click email link)
  const [step, setStep] = useState<'identify' | 'sent'>('identify')

  const { formData, errors, touched, setErrors, handleChange, handleBlur, validateForm } =
    useFormValidation({
      initialValues: { email: prefillEmail },
      rules: {
        email: {
          validate: (value) => {
            if (!value.trim()) return AUTH_VALIDATION.emailRequired
            if (!isValidEmail(value)) return AUTH_VALIDATION.emailInvalid
            return undefined
          },
        },
      },
    })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // OTP code-entry state (sent step)
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (user && !authLoading) {
      navigate(resolvePostAuthDestination(profile, redirectAfterLogin), { replace: true })
    }
  }, [user, profile, authLoading, navigate, redirectAfterLogin])

  // Auto-verify once the user types all 6 digits.
  // Note: `isVerifying` is intentionally NOT in deps — flipping it inside the
  // effect would cancel the in-flight request via cleanup and leave the
  // input stuck disabled.
  useEffect(() => {
    if (code.length !== 6) return
    let cancelled = false
    setIsVerifying(true)
    setVerifyError(null)
    ;(async () => {
      const { error } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: code,
        type: 'email',
      })
      if (cancelled) return
      if (error) {
        setVerifyError(AUTH_ERRORS.invalidOrExpiredCode)
        setCode('')
      }
      setIsVerifying(false)
      // success: AuthContext.onAuthStateChange fires → user effect navigates
    })()
    return () => {
      cancelled = true
    }
  }, [code, formData.email])

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setErrors({})
    setIsSubmitting(true)
    try {
      const { error } = await sendMagicLink(formData.email, callbackUrl)

      if (error) {
        if (error.message.includes('rate') || (error as { status?: number }).status === 429) {
          setErrors({ general: AUTH_ERRORS.rateLimited })
        } else {
          setErrors({ general: AUTH_ERRORS.generic })
        }
        setIsSubmitting(false)
        return
      }

      setCode('')
      setVerifyError(null)
      setStep('sent')
      setIsSubmitting(false)
    } catch {
      setErrors({ general: AUTH_ERRORS.generic })
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (isResending) return
    setIsResending(true)
    const { error } = await sendMagicLink(formData.email, callbackUrl)
    setIsResending(false)
    if (error) {
      toast.error(AUTH_ERRORS.generic)
      return
    }
    setCode('')
    setVerifyError(null)
    toast.success('Lenke sendt på nytt')
  }

  // Code-entry screen — click the link or type the 6-digit code
  if (step === 'sent') {
    return (
      <AuthLayout title="" customContent>
        <div className="mb-8 w-full space-y-2 text-center">
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Sjekk e-posten din
          </h1>
          <p className="text-base text-foreground-muted">
            Klikk lenken eller skriv inn koden.
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-4">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            disabled={isVerifying}
            autoFocus
            aria-invalid={!!verifyError || undefined}
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} aria-invalid={!!verifyError || undefined} />
              ))}
            </InputOTPGroup>
          </InputOTP>

          {verifyError && (
            <p className="text-base text-danger" role="alert">
              {verifyError}
            </p>
          )}

          <p className="text-base text-foreground-muted">
            Fikk du ikke e-post?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-foreground hover:underline disabled:cursor-not-allowed disabled:text-foreground-muted"
            >
              Send på nytt
            </button>
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Logg inn"
      footer={
        <p className="text-sm text-foreground-muted">
          Ved å fortsette godtar du{' '}
          <Link to="/terms" className="underline hover:text-foreground">
            vilkårene
          </Link>
          .
        </p>
      }
    >
      <div className="w-full">
        <GoogleAuthButton redirectTo={callbackUrl} />
      </div>

      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <Separator className="flex-1" />
        <span className="text-sm text-foreground-muted">eller</span>
        <Separator className="flex-1" />
      </div>

      <form className="w-full space-y-6" onSubmit={handleMagicLink}>
        <AuthFormField
          id="email"
          label="E-post"
          hideLabel
          type="email"
          value={formData.email}
          error={errors.email}
          touched={touched.email}
          placeholder={AUTH_PLACEHOLDERS.email}
          onChange={(v) => handleChange('email', v)}
          onBlur={() => handleBlur('email')}
        />

        {errors.general && (
          <p className="text-base text-danger" role="alert">
            {errors.general}
          </p>
        )}

        <Button
          type="submit"
          loading={isSubmitting}
          size="lg"
          className="w-full"
        >
          Fortsett
        </Button>
      </form>
    </AuthLayout>
  )
}

export default AuthPage
