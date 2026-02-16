import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Infinity, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { authPageVariants, authPageTransition } from '@/lib/motion';
import { useFormValidation } from '@/hooks/use-form-validation';
import { toast } from 'sonner';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const { formData, errors, touched, setErrors, handleChange, handleBlur, validateForm, resetForm } =
    useFormValidation({
      initialValues: { email: '' },
      rules: {
        email: {
          validate: (value) => {
            if (!value.trim()) return 'Skriv inn e-posten din'
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Sjekk at e-posten er riktig'
            return undefined
          },
        },
      },
    });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const { error } = await resetPassword(formData.email);

      if (error) {
        setErrors({ general: 'Noe gikk galt. Prøv igjen.' });
        setIsSubmitting(false);
        return;
      }

      // Success - show confirmation message
      toast.success('E-post sendt', {
        description: 'Sjekk innboksen din for en lenke til tilbakestilling.',
      });
      setEmailSent(true);
      setIsSubmitting(false);
    } catch (err) {
      setErrors({ general: 'Noe gikk galt. Prøv igjen.' });
      setIsSubmitting(false);
    }
  };

  // Success state - Email sent
  if (emailSent) {
    return (
      <div className="min-h-screen w-full bg-surface text-text-primary font-geist antialiased flex flex-col selection:bg-zinc-200 selection:text-zinc-900">
        {/* Minimal Header */}
        <header className="w-full pt-8 pb-4 px-6 flex items-center justify-between z-50 max-w-6xl mx-auto">
          <div className="w-24">
            {/* Empty space to balance layout */}
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
            {/* Success Icon */}
            <div className="w-16 h-16 rounded-full bg-status-confirmed-bg flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-status-confirmed-text" />
            </div>

            <div className="text-center mb-8 space-y-2 w-full">
              <h1 className="text-2xl font-medium tracking-tight text-text-primary">
                Sjekk e-posten din
              </h1>
              <p className="text-text-secondary text-sm">
                Vi har sendt en lenke til{' '}
                <span className="font-medium text-text-primary">{formData.email}</span>
              </p>
            </div>

            <div className="w-full space-y-4">
              <Alert variant="neutral" size="sm" icon={false}>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Sjekk spam-mappen hvis du ikke finner den.
                </p>
              </Alert>

              <Button
                onClick={() => navigate('/login')}
                className="w-full h-11"
              >
                Til innlogging
              </Button>

              <button
                onClick={() => {
                  setEmailSent(false);
                  resetForm();
                }}
                className="w-full text-sm text-text-tertiary hover:text-text-primary transition-colors"
              >
                Send på nytt
              </button>
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

  // Form state - Request reset
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
              Glemt passord?
            </h1>
            <p className="text-text-secondary text-sm">
              Skriv inn e-posten din, så sender vi en lenke.
            </p>
          </div>

          <form className="w-full space-y-5" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-text-secondary"
              >
                E-post
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary group-focus-within:text-text-primary pointer-events-none transition-colors" />
                <Input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={`pl-10 ${
                    touched.email && errors.email
                      ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive'
                      : ''
                  }`}
                  placeholder="navn@bedrift.no"
                />
              </div>
              {touched.email && errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
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
              loadingText="Sender"
              className="w-full h-11 mt-2"
            >
              Send lenke
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

export default ForgotPasswordPage;