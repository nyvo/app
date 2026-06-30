import { Link, useNavigate, useLocation, useSearchParams, type Location } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Eye, EyeOff, Check } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { FieldError } from '@/components/ui/field-error'
import { useAuth } from '@/contexts/AuthContext'
import { useFormValidation } from '@/hooks/use-form-validation'
import { AuthLayout } from '@/components/auth/AuthLayout'
import {
  AUTH_ROUTES,
  parseAuthIntent,
  resolvePostAuthDestination,
  sanitizeNextPath,
} from '@/lib/auth-routes'
import { AUTH_VALIDATION, AUTH_ERRORS } from '@/lib/auth-messages'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import { supabase } from '@/lib/supabase'
import { isValidEmail } from '@/lib/utils'

const ROUTES = AUTH_ROUTES

/** Live password-requirement row — neutral filled disc when met, empty ring when not. */
function Rule({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li
      className={`flex items-center gap-2.5 text-sm transition-colors ${
        met ? 'text-foreground' : 'text-foreground-muted'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
          met ? 'border-foreground bg-foreground' : 'border-border bg-transparent'
        }`}
      >
        {met && <Check className="size-2.5 text-background" strokeWidth={3} />}
      </span>
      {children}
    </li>
  )
}

/**
 * Combined sign-in / sign-up surface (§ auth rework).
 *
 * One screen, email + password both visible. On "Fortsett" a SECURITY DEFINER
 * RPC (check_email_auth_status) decides the branch:
 *   • email unknown          → sign up with the typed password (rules enforced)
 *   • exists, has password    → sign in
 *   • exists, no password     → Google/magic-link account adopting a password:
 *                               send a code, and once verified set the password
 *                               ("bridge"), so next time email+password works.
 *
 * Alternatives: Google (filled-neutral) and "Send meg en kode i stedet" (the
 * existing OTP path). The code screen is a STATE, not a separate route.
 */
const AuthPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const {
    sendMagicLink,
    signInWithPassword,
    signUpWithPassword,
    setPassword,
    checkEmailAuthStatus,
    user,
    profile,
    isLoading: authLoading,
  } = useAuth()

  const locationState = location.state as { email?: string; from?: Location } | null
  const prefillEmail = locationState?.email ?? ''
  const intent = parseAuthIntent(searchParams.get('intent'))
  const fromLocation = locationState?.from
  const redirectAfterLogin =
    sanitizeNextPath(searchParams.get('next')) ??
    (fromLocation ? `${fromLocation.pathname}${fromLocation.search ?? ''}` : null) ??
    ROUTES.dashboard
  const callbackUrl = `${window.location.origin}${ROUTES.callback}?next=${encodeURIComponent(redirectAfterLogin)}${intent ? `&intent=${intent}` : ''}`

  // Two surfaces: the credentials form, and the code-entry screen.
  const [step, setStep] = useState<'credentials' | 'code'>('credentials')

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

  const [password, setPasswordValue] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const rules = {
    length: password.length >= 8,
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }
  const passwordValid = rules.length && rules.number && rules.special

  // Code-entry state. `reason` tells the verify effect what to do on success:
  //   'login'  → plain OTP login        'signup' → confirm a new account
  //   'bridge' → set pendingPassword after the code logs them in
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [codeContext, setCodeContext] = useState<{
    reason: 'login' | 'signup' | 'bridge'
    pendingPassword?: string
  }>({ reason: 'login' })

  useEffect(() => {
    if (user && !authLoading && profile) {
      navigate(resolvePostAuthDestination(profile, redirectAfterLogin, intent), { replace: true })
    }
  }, [user, profile, authLoading, navigate, redirectAfterLogin, intent])

  // Auto-verify once all 6 digits are entered. `isVerifying`/`codeContext` are
  // intentionally read fresh; flipping isVerifying in deps would cancel the
  // in-flight request via cleanup.
  useEffect(() => {
    if (code.length !== 6) return
    let cancelled = false
    setIsVerifying(true)
    setVerifyError(null)
    ;(async () => {
      const otpType = codeContext.reason === 'signup' ? 'signup' : 'email'
      const { error } = await supabase.auth.verifyOtp({
        email: formData.email.trim(),
        token: code,
        type: otpType,
      })
      if (cancelled) return
      if (error) {
        setVerifyError(AUTH_ERRORS.invalidOrExpiredCode)
        setCode('')
        setIsVerifying(false)
        return
      }
      // Bridge: the code just authenticated the (Google/magic-link) account —
      // now persist the password they typed so email+password works next time.
      if (codeContext.reason === 'bridge' && codeContext.pendingPassword) {
        await setPassword(codeContext.pendingPassword)
      }
      setIsVerifying(false)
      // success → AuthContext.onAuthStateChange fires → navigate effect runs
    })()
    return () => {
      cancelled = true
    }
  }, [code, formData.email, codeContext, setPassword])

  const goToCode = (ctx: { reason: 'login' | 'signup' | 'bridge'; pendingPassword?: string }) => {
    setCode('')
    setVerifyError(null)
    setCodeContext(ctx)
    setStep('code')
  }

  const rateOrGeneric = (error: Error) =>
    error.message.includes('rate') || (error as { status?: number }).status === 429
      ? AUTH_ERRORS.rateLimited
      : AUTH_ERRORS.generic

  // Main submit — branch on the email's auth status.
  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setPasswordError(null)
    if (!validateForm()) return
    if (!password) {
      setPasswordError('Skriv inn et passord')
      return
    }

    setIsSubmitting(true)
    const email = formData.email.trim()
    const { exists, hasPassword, error: checkError } = await checkEmailAuthStatus(email)
    if (checkError) {
      setErrors({ general: AUTH_ERRORS.generic })
      setIsSubmitting(false)
      return
    }

    // New email → create the account.
    if (!exists) {
      if (!passwordValid) {
        setPasswordError('Passordet oppfyller ikke kravene under')
        setIsSubmitting(false)
        return
      }
      const { error, needsConfirmation } = await signUpWithPassword(email, password, callbackUrl)
      if (error) {
        setErrors({ general: rateOrGeneric(error) })
        setIsSubmitting(false)
        return
      }
      if (needsConfirmation) goToCode({ reason: 'signup' })
      setIsSubmitting(false)
      return
    }

    // Existing account with a password → sign in.
    if (hasPassword) {
      const { error } = await signInWithPassword(email, password)
      if (error) {
        setPasswordError('Feil passord. Prøv igjen, eller be om en kode.')
        setIsSubmitting(false)
        return
      }
      setIsSubmitting(false)
      return
    }

    // Existing passwordless account (Google / magic-link) → bridge: send a code,
    // set the typed password once it logs them in.
    const { error } = await sendMagicLink(email, callbackUrl)
    if (error) {
      setErrors({ general: rateOrGeneric(error) })
      setIsSubmitting(false)
      return
    }
    goToCode({ reason: 'bridge', pendingPassword: password })
    setIsSubmitting(false)
  }

  // Explicit "Send meg en kode i stedet" — plain OTP login.
  const handleUseCode = async () => {
    setErrors({})
    setPasswordError(null)
    if (!validateForm()) return
    setIsSubmitting(true)
    const { error } = await sendMagicLink(formData.email.trim(), callbackUrl)
    if (error) {
      setErrors({ general: rateOrGeneric(error) })
      setIsSubmitting(false)
      return
    }
    goToCode({ reason: 'login' })
    setIsSubmitting(false)
  }

  const handleResend = async () => {
    if (isResending) return
    setIsResending(true)
    const email = formData.email.trim()
    const { error } =
      codeContext.reason === 'signup'
        ? await supabase.auth.resend({ type: 'signup', email })
        : await sendMagicLink(email, callbackUrl)
    setIsResending(false)
    if (error) {
      setVerifyError(AUTH_ERRORS.generic)
      return
    }
    setCode('')
    setVerifyError(null)
  }

  // ── Code-entry screen ──────────────────────────────────────────────────────
  if (step === 'code') {
    return (
      <AuthLayout title="" customContent>
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-2xl font-medium text-foreground">Sjekk e-posten din</h1>
          <p className="text-base text-foreground-muted">
            Vi sendte en kode til {formData.email.trim() || 'e-posten din'}.
          </p>
        </div>

        <InputOTP
          maxLength={6}
          value={code}
          onChange={setCode}
          disabled={isVerifying}
          autoFocus
          aria-invalid={!!verifyError || undefined}
        >
          <InputOTPGroup className="gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className="size-12 rounded-xl"
                aria-invalid={!!verifyError || undefined}
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        {verifyError && (
          <p className="mt-4 text-base text-danger" role="alert">
            {verifyError}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-foreground-muted">
          Fikk du ingen kode?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="font-medium text-foreground hover:underline disabled:cursor-not-allowed disabled:text-foreground-muted"
          >
            Send på nytt
          </button>
        </p>

        <button
          type="button"
          onClick={() => {
            setStep('credentials')
            setCode('')
            setVerifyError(null)
          }}
          className="mt-8 text-sm font-medium text-primary hover:underline"
        >
          Bruk passord i stedet
        </button>
      </AuthLayout>
    )
  }

  // ── Credentials screen ─────────────────────────────────────────────────────
  return (
    <AuthLayout title="" customContent>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-medium text-foreground">Logg inn eller opprett konto</h1>
      </div>

      <GoogleAuthButton redirectTo={callbackUrl} variant="secondary" className="rounded-xl" />

      <div className="my-4 flex w-full justify-center">
        <span className="text-sm text-foreground-muted">eller</span>
      </div>

      <form className="w-full space-y-5" onSubmit={handleContinue}>
        <div className="grid gap-2">
          <label htmlFor="email" className="sr-only">
            E-post
          </label>
          <Input
            id="email"
            type="email"
            placeholder="E-post"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            aria-invalid={(touched.email && !!errors.email) || undefined}
            aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
          />
          {touched.email && errors.email && (
            <FieldError id="email-error" className="mt-0">
              {errors.email}
            </FieldError>
          )}
        </div>

        <div>
          <label htmlFor="password" className="sr-only">
            Passord
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Passord"
              value={password}
              onChange={(e) => setPasswordValue(e.target.value)}
              className="pr-10"
              aria-invalid={!!passwordError || undefined}
              aria-describedby={passwordError ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-foreground-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/15"
              aria-label={showPassword ? 'Skjul passord' : 'Vis passord'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {/* Rules appear only once typing starts — a returning user who autofills
              an existing password never sees them. */}
          {password.length > 0 && (
            <ul className="mt-3 space-y-2">
              <Rule met={rules.length}>Minst 8 tegn</Rule>
              <Rule met={rules.number}>Minst ett tall</Rule>
              <Rule met={rules.special}>Minst ett spesialtegn</Rule>
            </ul>
          )}

          {passwordError && (
            <FieldError id="password-error" className="mt-2">
              {passwordError}
            </FieldError>
          )}
        </div>

        {errors.general && (
          <p className="text-base text-danger" role="alert">
            {errors.general}
          </p>
        )}

        <Button type="submit" loading={isSubmitting} size="lg" className="w-full rounded-xl">
          Fortsett
        </Button>
      </form>

      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={handleUseCode}
          className="text-sm font-medium text-primary hover:underline"
        >
          Send meg en kode i stedet
        </button>
      </div>

      <p className="mt-14 max-w-xs text-center text-sm text-foreground-muted">
        Ved å fortsette godtar du{' '}
        <Link to="/terms" className="font-medium text-foreground-muted hover:text-foreground">
          vilkårene
        </Link>{' '}
        og{' '}
        <Link to="/personvern" className="font-medium text-foreground-muted hover:text-foreground">
          personvernerklæringen
        </Link>
        .
      </p>
    </AuthLayout>
  )
}

export default AuthPage
