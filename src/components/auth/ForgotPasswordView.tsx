import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import { useFormValidation } from '@/hooks/use-form-validation'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthFormField } from '@/components/auth/AuthFormField'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import { AUTH_VALIDATION, AUTH_ERRORS, AUTH_PLACEHOLDERS, AUTH_HINTS } from '@/lib/auth-messages'
import { isValidEmail } from '@/lib/utils'
import { toast } from 'sonner'

export const ForgotPasswordView = () => {
  const redirectOrigin = `${window.location.origin}${AUTH_ROUTES.dashboard}`
  const { sendMagicLink } = useAuth()

  const { formData, errors, touched, setErrors, handleChange, handleBlur, validateForm, resetForm } =
    useFormValidation({
      initialValues: { email: '' },
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
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setErrors({})

    try {
      const { error } = await sendMagicLink(formData.email, redirectOrigin)

      if (error) {
        if (error.message.includes('rate') || (error as { status?: number }).status === 429) {
          setErrors({ general: AUTH_ERRORS.rateLimited })
        } else {
          setErrors({ general: AUTH_ERRORS.generic })
        }
        setIsSubmitting(false)
        return
      }

      toast.success('E-post sendt', {
        description: 'Sjekk innboksen din for lenken.',
      })
      setEmailSent(true)
      setIsSubmitting(false)
    } catch {
      setErrors({ general: AUTH_ERRORS.generic })
      setIsSubmitting(false)
    }
  }

  if (emailSent) {
    return (
      <AuthLayout
        title=""
        customContent
        footer={
          <p className="text-xs text-foreground-muted">
            <Link to={AUTH_ROUTES.login} className="text-sm font-medium text-foreground hover:underline">
              Til innlogging
            </Link>
          </p>
        }
      >
        <div className="text-center mb-8 space-y-2 w-full">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sjekk e-posten din
          </h1>
          <p className="text-sm text-foreground-muted">
            Vi har sendt en lenke til{' '}
            <span className="text-foreground">{formData.email}</span>
          </p>
        </div>

        <div className="w-full space-y-4">
          <Alert variant="neutral" size="sm">
            {AUTH_HINTS.checkSpam}
          </Alert>

          <Button
            onClick={() => {
              setEmailSent(false)
              resetForm()
            }}
            variant="outline-soft"
            size="cta" className="w-full"
          >
            Send på nytt
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Glemt passord?"
      subtitle="Skriv inn e-posten din, så sender vi en lenke."
      footer={
        <p className="text-xs text-foreground-muted">
          Husker du passordet ditt?{' '}
          <Link to={AUTH_ROUTES.login} className="text-sm font-medium text-foreground hover:underline">
            Logg inn
          </Link>
        </p>
      }
    >
      <form className="w-full space-y-6" onSubmit={handleSubmit}>
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

        {errors.general && (
          <Alert variant="destructive" size="sm">
            {errors.general}
          </Alert>
        )}

        <Button
          type="submit"
          loading={isSubmitting}
          loadingText="Sender"
          size="cta" className="w-full mt-2"
        >
          Send lenke
        </Button>
      </form>
    </AuthLayout>
  )
}
