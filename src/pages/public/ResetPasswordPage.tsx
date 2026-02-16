import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Infinity, ArrowLeft, CheckCircle2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/lib/supabase';
import { authPageVariants, authPageTransition } from '@/lib/motion';
import { useFormValidation } from '@/hooks/use-form-validation';

const ResetPasswordPage = () => {
  const { formData, errors, touched, setErrors, handleChange, handleBlur, validateField, validateForm } =
    useFormValidation({
      initialValues: { password: '', confirmPassword: '' },
      rules: {
        password: {
          validate: (value) => {
            if (!value.trim()) return 'Skriv inn et passord'
            if (value.length < 8) return 'Passordet må ha minst 8 tegn'
            return undefined
          },
        },
        confirmPassword: {
          validate: (value, fd) => {
            if (!value.trim()) return 'Gjenta passordet'
            if (fd.password !== value) return 'Passordene er ikke like'
            return undefined
          },
        },
      },
    });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  // Check if user has valid reset session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setIsValidSession(false);
        return;
      }

      setIsValidSession(true);
    };

    checkSession();
  }, []);

  // Custom password change handler: also re-validate confirmPassword
  const handlePasswordChange = (value: string) => {
    handleChange('password', value);
    if (touched.confirmPassword) {
      // Re-validate confirmPassword after React processes the password state update
      setTimeout(() => validateField('confirmPassword'), 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (error) {
        setErrors({ general: 'Passordet ble ikke oppdatert. Prøv igjen.' });
        setIsSubmitting(false);
        return;
      }

      // Success - show confirmation
      setResetSuccess(true);
      setIsSubmitting(false);
    } catch (err) {
      setErrors({ general: 'Noe gikk galt. Prøv igjen.' });
      setIsSubmitting(false);
    }
  };

  // Invalid/expired session
  if (isValidSession === false) {
    return (
      <div className="min-h-screen w-full bg-surface text-text-primary font-geist antialiased flex flex-col selection:bg-zinc-200 selection:text-zinc-900">
        {/* Minimal Header */}
        <header className="w-full pt-8 pb-4 px-6 flex items-center justify-between z-50 max-w-6xl mx-auto">
          <div className="w-24"></div>
          <Link to="/" className="flex items-center gap-2 select-none">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-white">
              <Infinity className="w-3.5 h-3.5" />
            </div>
            <span className="text-lg font-medium tracking-tighter text-text-primary">
              Ease
            </span>
          </Link>
          <div className="w-24"></div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 w-full max-w-sm mx-auto py-12">
          <motion.div
            variants={authPageVariants}
            initial="initial"
            animate="animate"
            transition={authPageTransition}
            className="w-full flex flex-col items-center"
          >
            <div className="text-center mb-8 space-y-4 w-full">
              <div className="w-16 h-16 rounded-full bg-status-error-bg flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-status-error-text" />
              </div>
              <h1 className="text-2xl font-medium tracking-tight text-text-primary">
                Ugyldig lenke
              </h1>
              <p className="text-text-secondary text-sm">
                Lenken er utløpt eller fungerer ikke.
              </p>
            </div>

            <div className="w-full space-y-3">
              <Button
                asChild
                className="w-full h-11"
              >
                <Link to="/forgot-password">
                  Be om ny lenke
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full h-11"
              >
                <Link to="/login">
                  Til innlogging
                </Link>
              </Button>
            </div>
          </motion.div>
        </main>

        {/* Simple Footer */}
        <footer className="py-6 text-center border-t border-border bg-surface">
          <p className="text-xs text-text-tertiary">
            Trenger du hjelp?
          </p>
        </footer>
      </div>
    );
  }

  // Loading session check
  if (isValidSession === null) {
    return (
      <div className="min-h-screen w-full bg-surface text-text-primary font-geist antialiased flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  // Success state - Password reset
  if (resetSuccess) {
    return (
      <div className="min-h-screen w-full bg-surface text-text-primary font-geist antialiased flex flex-col selection:bg-zinc-200 selection:text-zinc-900">
        {/* Minimal Header */}
        <header className="w-full pt-8 pb-4 px-6 flex items-center justify-between z-50 max-w-6xl mx-auto">
          <div className="w-24"></div>
          <Link to="/" className="flex items-center gap-2 select-none">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-white">
              <Infinity className="w-3.5 h-3.5" />
            </div>
            <span className="text-lg font-medium tracking-tighter text-text-primary">
              Ease
            </span>
          </Link>
          <div className="w-24"></div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 w-full max-w-sm mx-auto py-12">
          <motion.div
            variants={authPageVariants}
            initial="initial"
            animate="animate"
            transition={authPageTransition}
            className="w-full flex flex-col items-center"
          >
            {/* Success Icon */}
            <div className="w-16 h-16 rounded-full bg-status-confirmed-bg flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-status-confirmed-text" />
            </div>

            <div className="text-center mb-8 space-y-2 w-full">
              <h1 className="text-2xl font-medium tracking-tight text-text-primary">
                Passordet er oppdatert
              </h1>
              <p className="text-text-secondary text-sm">
                Passordet er oppdatert. Du kan nå logge inn.
              </p>
            </div>

            <div className="w-full">
              <Button
                asChild
                className="w-full h-11"
              >
                <Link to="/login">
                  Gå til innlogging
                </Link>
              </Button>
            </div>
          </motion.div>
        </main>

        {/* Simple Footer */}
        <footer className="py-6 text-center border-t border-border bg-surface">
          <p className="text-xs text-text-tertiary">
            <Link
              to="/login"
              className="text-text-primary font-medium hover:underline"
            >
              Til innlogging
            </Link>
          </p>
        </footer>
      </div>
    );
  }

  // Form state - Reset password
  return (
    <div className="min-h-screen w-full bg-surface text-text-primary font-geist antialiased flex flex-col selection:bg-zinc-200 selection:text-zinc-900">
      {/* Minimal Header */}
      <header className="w-full pt-8 pb-4 px-6 flex items-center justify-between z-50 max-w-6xl mx-auto">
        <div className="w-24">
          <Button variant="outline-soft" size="sm" className="text-text-secondary hover:text-text-primary" asChild>
            <Link to="/login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tilbake
            </Link>
          </Button>
        </div>
        
        <Link to="/" className="flex items-center gap-2 select-none">
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-white">
            <Infinity className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-medium tracking-tighter text-text-primary">
            Ease
          </span>
        </Link>

        <div className="w-24" />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 w-full max-w-sm mx-auto py-12">
        <motion.div
          variants={authPageVariants}
          initial="initial"
          animate="animate"
          transition={authPageTransition}
          className="w-full flex flex-col items-center"
        >
          <div className="text-center mb-8 space-y-2 w-full">
            <h1 className="text-2xl font-medium tracking-tight text-text-primary">
              Tilbakestill passord
            </h1>
            <p className="text-text-secondary text-sm">
              Velg et nytt passord.
            </p>
          </div>

          <form className="w-full space-y-5" onSubmit={handleSubmit}>
            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-text-secondary"
              >
                Nytt passord
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className={`pr-10 ${
                    touched.password && errors.password
                      ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive'
                      : ''
                  }`}
                  placeholder="Minst 8 tegn"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {touched.password && errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-medium text-text-secondary"
              >
                Gjenta passord
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  className={`pr-10 ${
                    touched.confirmPassword && errors.confirmPassword
                      ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive'
                      : ''
                  }`}
                  placeholder="Gjenta passordet"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {touched.confirmPassword && errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Password requirements */}
            <div className="p-3 rounded-lg bg-surface-elevated">
              <p className="text-xs text-text-secondary font-medium mb-1">Krav</p>
              <ul className="text-xs text-text-tertiary space-y-0.5 ml-3">
                <li className="list-disc">Minst 8 tegn</li>
              </ul>
            </div>

            {/* General Error */}
            {errors.general && (
              <Alert variant="destructive" size="sm" icon={false}>
                <p className="text-xs text-destructive">{errors.general}</p>
              </Alert>
            )}

            <Button
              type="submit"
              loading={isSubmitting}
              loadingText="Oppdaterer"
              className="w-full h-11 mt-2"
            >
              Oppdater passord
            </Button>
          </form>
        </motion.div>
      </main>

      {/* Simple Footer */}
      <footer className="py-6 text-center border-t border-border bg-surface">
        <p className="text-xs text-text-tertiary">
          Husker du passordet ditt?{' '}
          <Link
            to="/login"
            className="text-text-primary font-medium hover:underline"
          >
            Logg inn
          </Link>
        </p>
      </footer>
    </div>
  );
};

export default ResetPasswordPage;