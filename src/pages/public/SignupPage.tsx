import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import { useFormValidation } from '@/hooks/use-form-validation'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthFormField } from '@/components/auth/AuthFormField'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import { AUTH_VALIDATION, AUTH_ERRORS, AUTH_PLACEHOLDERS, AUTH_HINTS } from '@/lib/auth-messages'

const ROUTES = AUTH_ROUTES.teacher

/** Generate URL-friendly slug from organization name */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[æ]/g, 'ae')
    .replace(/[ø]/g, 'o')
    .replace(/[å]/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const SignupPage = () => {
  const navigate = useNavigate()
  const { signUp, ensureOrganization, user, isLoading: authLoading, currentOrganization } = useAuth()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const { formData, errors, touched, setErrors, handleChange, handleBlur, validateForm } =
    useFormValidation({
      initialValues: { email: '', password: '', studioName: '' },
      rules: {
        email: {
          validate: (value) => {
            if (!value.trim()) return AUTH_VALIDATION.emailRequired
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return AUTH_VALIDATION.emailInvalid
            return undefined
          },
        },
        password: {
          validate: (value) => {
            if (!value.trim()) return AUTH_VALIDATION.passwordNewRequired
            if (value.length < 8) return AUTH_VALIDATION.passwordMinLength
            return undefined
          },
        },
        studioName: {
          validate: (value) => {
            if (!value.trim()) return AUTH_VALIDATION.studioNameRequired
            return undefined
          },
        },
      },
    })

  // Redirect if already logged in with org
  useEffect(() => {
    if (user && !authLoading && currentOrganization) {
      navigate(ROUTES.dashboard, { replace: true })
    }
  }, [user, authLoading, currentOrganization, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setErrors({})

    try {
      // Step 1: Create user account
      // NOTE: This flow assumes Supabase email confirmation is disabled for teachers.
      // If email confirmation is enabled, signUp will succeed but ensureOrganization
      // may fail due to missing session. The OrgSetupFallback in ProtectedRoute
      // handles this recovery case.
      const { error: signUpError } = await signUp(
        formData.email,
        formData.password,
        formData.studioName.trim()
      )

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setErrors({ email: AUTH_ERRORS.emailAlreadyRegistered })
        } else {
          setErrors({ general: signUpError.message })
        }
        setIsSubmitting(false)
        return
      }

      // Step 2: Create organization (idempotent RPC)
      const slug = generateSlug(formData.studioName)
      const { error: orgError } = await ensureOrganization(formData.studioName.trim(), slug)

      if (orgError) {
        setErrors({ general: AUTH_ERRORS.accountCreatedOrgFailed })
        setIsSubmitting(false)
        return
      }

      // Step 3: Navigate to teacher dashboard
      navigate(ROUTES.dashboard, { replace: true })
    } catch {
      setErrors({ general: AUTH_ERRORS.generic })
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      context="teacher"
      title="Opprett din konto"
      subtitle="Opprett konto og kom i gang med studioet ditt."
      backTo="/"
      footer={
        <p className="text-xs text-text-secondary">
          Har du allerede en konto?{' '}
          <Link to={ROUTES.login} className="text-text-primary font-medium hover:underline">
            Logg inn
          </Link>
        </p>
      }
    >
      <form className="w-full space-y-5" onSubmit={handleSubmit}>
        <AuthFormField
          id="studioName"
          label="Navn på studio"
          type="text"
          value={formData.studioName}
          error={errors.studioName}
          touched={touched.studioName}
          placeholder={AUTH_PLACEHOLDERS.studioName}
          hint={AUTH_HINTS.studioNameHelper}
          onChange={(v) => handleChange('studioName', v)}
          onBlur={() => handleBlur('studioName')}
        />

        <AuthFormField
          id="email"
          label="E-post"
          type="email"
          value={formData.email}
          error={errors.email}
          touched={touched.email}
          placeholder={AUTH_PLACEHOLDERS.email}
          onChange={(v) => handleChange('email', v)}
          onBlur={() => handleBlur('email')}
        />

        <AuthFormField
          id="password"
          label="Passord"
          type="password"
          value={formData.password}
          error={errors.password}
          touched={touched.password}
          placeholder={AUTH_PLACEHOLDERS.password}
          hint={formData.password.length < 8 ? AUTH_HINTS.passwordMinLength : undefined}
          onChange={(v) => handleChange('password', v)}
          onBlur={() => handleBlur('password')}
        />

        {errors.general && (
          <Alert variant="destructive" size="sm">
            <p className="text-xs text-destructive">{errors.general}</p>
          </Alert>
        )}

        <Button
          type="submit"
          loading={isSubmitting}
          loadingText="Oppretter konto"
          className="w-full h-11 mt-2"
        >
          Opprett konto
        </Button>

        <p className="text-center text-xs text-text-tertiary pt-2">
          Ved å opprette konto godtar du{' '}
          <Link to="/terms" className="underline hover:text-text-primary">
            vilkår
          </Link>
          .
        </p>
      </form>
    </AuthLayout>
  )
}

export default SignupPage
