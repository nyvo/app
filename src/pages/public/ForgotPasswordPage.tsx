import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Infinity, ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react';
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
      <div className="min-h-screen w-full bg-[#FAF9F6] text-stone-900 font-sans antialiased flex flex-col selection:bg-stone-200 selection:text-stone-900">
        {/* Minimal Header */}
        <header className="w-full pt-8 pb-4 flex justify-center z-50">
          <Link to="/" className="flex items-center gap-2 select-none">
            <div className="w-6 h-6 bg-stone-900 rounded-md flex items-center justify-center text-white shadow-sm">
              <Infinity className="w-3.5 h-3.5" />
            </div>
            <span className="text-lg font-semibold tracking-tighter text-stone-900">
              Ease
            </span>
          </Link>
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
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>

            <div className="text-center mb-8 space-y-2 w-full">
              <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
                Sjekk e-posten din
              </h1>
              <p className="text-stone-500 text-sm">
                Vi har sendt en lenke for tilbakestilling av passord til{' '}
                <span className="font-medium text-stone-900">{formData.email}</span>
              </p>
            </div>

            <div className="w-full space-y-4">
              <div className="p-4 rounded-lg bg-stone-50 border border-stone-200">
                <p className="text-xs text-stone-600 leading-relaxed">
                  Hvis du ikke mottar en e-post innen noen minutter, sjekk søppelpost-mappen din eller prøv igjen.
                </p>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="w-full h-11 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                Tilbake til innlogging
              </button>

              <button
                onClick={() => {
                  setEmailSent(false);
                  setFormData({ email: '' });
                  setErrors({});
                  setTouched({});
                }}
                className="w-full text-sm text-stone-500 hover:text-stone-900 transition-colors"
              >
                Send på nytt
              </button>
            </div>
          </motion.div>
        </main>

        {/* Simple Footer */}
        <footer className="py-6 text-center border-t border-stone-200/50">
          <p className="text-xs text-stone-400">
            <Link
              to="/login"
              className="text-stone-900 font-medium hover:underline"
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
    <div className="min-h-screen w-full bg-[#FAF9F6] text-stone-900 font-sans antialiased flex flex-col selection:bg-stone-200 selection:text-stone-900">
      {/* Minimal Header */}
      <header className="w-full pt-8 pb-4 flex justify-center z-50">
        <Link to="/" className="flex items-center gap-2 select-none">
          <div className="w-6 h-6 bg-stone-900 rounded-md flex items-center justify-center text-white shadow-sm">
            <Infinity className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-semibold tracking-tighter text-stone-900">
            Ease
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 w-full max-w-sm mx-auto py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing }}
          className="w-full flex flex-col items-center"
        >
          {/* Back to login */}
          <div className="w-full mb-6">
            <Link
              to="/login"
              className="text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-1.5 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Tilbake
            </Link>
          </div>

          <div className="text-center mb-8 space-y-2 w-full">
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
              Glemt passord?
            </h1>
            <p className="text-stone-500 text-sm">
              Skriv inn e-postadressen din, så sender vi deg en lenke for å tilbakestille passordet.
            </p>
          </div>

          <form className="w-full space-y-5" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-stone-700"
              >
                E-post
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={`
                    w-full h-10 pl-10 pr-3 rounded-lg border bg-white text-sm text-stone-900 placeholder:text-stone-400
                    transition-all duration-150 outline-none
                    ${
                      touched.email && errors.email
                        ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        : 'border-stone-200 focus:border-stone-900 focus:ring-1 focus:ring-stone-900'
                    }
                  `}
                  placeholder="navn@bedrift.no"
                />
              </div>
              {touched.email && errors.email && (
                <p className="text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            {/* General Error */}
            {errors.general && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-xs text-red-600">{errors.general}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 mt-2 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sender...
                </>
              ) : (
                'Send tilbakestillingslenke'
              )}
            </button>
          </form>
        </motion.div>
      </main>

      {/* Simple Footer */}
      <footer className="py-6 text-center border-t border-stone-200/50">
        <p className="text-xs text-stone-400">
          Husker du passordet ditt?{' '}
          <Link
            to="/login"
            className="text-stone-900 font-medium hover:underline"
          >
            Logg inn
          </Link>
        </p>
      </footer>
    </div>
  );
};

export default ForgotPasswordPage;
