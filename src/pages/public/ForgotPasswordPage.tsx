import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Infinity, ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

interface FormData {
  email: string;
}

interface FormErrors {
  email?: string;
  general?: string;
}

const easing: [number, number, number, number] = [0.16, 1, 0.3, 1];

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    email: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Form handlers
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field);
  };

  const validateField = (field: keyof FormData) => {
    const newErrors: FormErrors = { ...errors };

    if (field === 'email') {
      if (!formData.email.trim()) {
        newErrors.email = 'E-postadresse er påkrevd';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Ugyldig e-postadresse';
      } else {
        delete newErrors.email;
      }
    }

    setErrors(newErrors);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'E-postadresse er påkrevd';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ugyldig e-postadresse';
    }

    setErrors(newErrors);
    setTouched({ email: true });
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const { error } = await resetPassword(formData.email);

      if (error) {
        setErrors({ general: 'En feil oppstod. Prøv igjen.' });
        setIsSubmitting(false);
        return;
      }

      // Success - show confirmation message
      setEmailSent(true);
      setIsSubmitting(false);
    } catch (err) {
      setErrors({ general: 'En uventet feil oppstod. Prøv igjen.' });
      setIsSubmitting(false);
    }
  };

  // Success state - Email sent
  if (emailSent) {
    return (
      <div className="min-h-screen w-full bg-surface text-text-primary font-geist antialiased flex flex-col selection:bg-gray-200 selection:text-gray-900">
        {/* Minimal Header */}
        <header className="w-full pt-8 pb-4 px-6 flex items-center justify-between z-50 max-w-6xl mx-auto">
          <div className="w-24">
            {/* Empty space to balance layout */}
          </div>
          
          <Link to="/" className="flex items-center gap-2 select-none">
            <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center text-white shadow-sm">
              <Infinity className="w-3.5 h-3.5" />
            </div>
            <span className="text-lg font-semibold tracking-tighter text-text-primary">
              Ease
            </span>
          </Link>

          <div className="w-24" />
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 w-full max-w-sm mx-auto py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easing }}
            className="w-full flex flex-col items-center"
          >
            {/* Success Icon */}
            <div className="w-16 h-16 rounded-full bg-status-confirmed-bg flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-status-confirmed-text" />
            </div>

            <div className="text-center mb-8 space-y-2 w-full">
              <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
                Sjekk e-posten din
              </h1>
              <p className="text-text-secondary text-sm">
                Vi har sendt en lenke for tilbakestilling av passord til{' '}
                <span className="font-medium text-text-primary">{formData.email}</span>
              </p>
            </div>

            <div className="w-full space-y-4">
              <div className="p-4 rounded-lg bg-surface-elevated">
                <p className="text-xs text-text-secondary leading-relaxed">
                  Hvis du ikke mottar en e-post innen noen minutter, sjekk søppelpost-mappen din eller prøv igjen.
                </p>
              </div>

              <Button
                onClick={() => navigate('/login')}
                className="w-full h-11"
              >
                Tilbake til innlogging
              </Button>

              <button
                onClick={() => {
                  setEmailSent(false);
                  setFormData({ email: '' });
                  setErrors({});
                  setTouched({});
                }}
                className="w-full text-sm text-text-tertiary hover:text-text-primary transition-colors"
              >
                Send på nytt
              </button>
            </div>
          </motion.div>
        </main>

        {/* Simple Footer */}
        <footer className="py-6 text-center border-t border-border bg-white">
          <p className="text-xs text-text-tertiary">
            <Link
              to="/login"
              className="text-text-primary font-medium hover:underline"
            >
              Tilbake til innlogging
            </Link>
          </p>
        </footer>
      </div>
    );
  }

  // Form state - Request reset
  return (
    <div className="min-h-screen w-full bg-surface text-text-primary font-geist antialiased flex flex-col selection:bg-gray-200 selection:text-gray-900">
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
          <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center text-white shadow-sm">
            <Infinity className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-semibold tracking-tighter text-text-primary">
            Ease
          </span>
        </Link>

        <div className="w-24" />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 w-full max-w-sm mx-auto py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing }}
          className="w-full flex flex-col items-center"
        >
          <div className="text-center mb-8 space-y-2 w-full">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              Glemt passord?
            </h1>
            <p className="text-text-secondary text-sm">
              Skriv inn e-postadressen din, så sender vi deg en lenke for å tilbakestille passordet.
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
                  onChange={(e) => handleInputChange('email', e.target.value)}
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
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-destructive">{errors.general}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sender...
                </>
              ) : (
                'Send tilbakestillingslenke'
              )}
            </Button>
          </form>
        </motion.div>
      </main>

      {/* Simple Footer */}
      <footer className="py-6 text-center border-t border-border bg-white">
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