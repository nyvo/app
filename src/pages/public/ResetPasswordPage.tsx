import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Infinity, ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface FormData {
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const easing: [number, number, number, number] = [0.16, 1, 0.3, 1];

const ResetPasswordPage = () => {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
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

    switch (field) {
      case 'password':
        if (!formData.password.trim()) {
          newErrors.password = 'Passord er påkrevd';
        } else if (formData.password.length < 8) {
          newErrors.password = 'Passord må være minst 8 tegn';
        } else {
          delete newErrors.password;
        }
        // Re-validate confirm password if it's been touched
        if (touched.confirmPassword && formData.confirmPassword) {
          if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passordene matcher ikke';
          } else {
            delete newErrors.confirmPassword;
          }
        }
        break;
      case 'confirmPassword':
        if (!formData.confirmPassword.trim()) {
          newErrors.confirmPassword = 'Bekreft passord';
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passordene matcher ikke';
        } else {
          delete newErrors.confirmPassword;
        }
        break;
    }

    setErrors(newErrors);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.password.trim()) {
      newErrors.password = 'Passord er påkrevd';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Passord må være minst 8 tegn';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Bekreft passord';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passordene matcher ikke';
    }

    setErrors(newErrors);
    setTouched({ password: true, confirmPassword: true });
    return Object.keys(newErrors).length === 0;
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
        setErrors({ general: 'Kunne ikke oppdatere passord. Prøv igjen.' });
        setIsSubmitting(false);
        return;
      }

      // Success - show confirmation
      setResetSuccess(true);
      setIsSubmitting(false);
    } catch (err) {
      setErrors({ general: 'En uventet feil oppstod. Prøv igjen.' });
      setIsSubmitting(false);
    }
  };

  // Invalid/expired session
  if (isValidSession === false) {
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
            <div className="text-center mb-8 space-y-4 w-full">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
                Ugyldig lenke
              </h1>
              <p className="text-stone-500 text-sm">
                Denne lenken for tilbakestilling av passord er ugyldig eller utløpt.
              </p>
            </div>

            <div className="w-full space-y-3">
              <Link
                to="/forgot-password"
                className="w-full h-11 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                Be om ny lenke
              </Link>
              <Link
                to="/login"
                className="w-full h-11 border border-stone-200 hover:bg-stone-50 text-stone-900 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2"
              >
                Tilbake til innlogging
              </Link>
            </div>
          </motion.div>
        </main>

        {/* Simple Footer */}
        <footer className="py-6 text-center border-t border-stone-200/50">
          <p className="text-xs text-stone-400">
            Trenger du hjelp? Kontakt support
          </p>
        </footer>
      </div>
    );
  }

  // Loading session check
  if (isValidSession === null) {
    return (
      <div className="min-h-screen w-full bg-[#FAF9F6] text-stone-900 font-sans antialiased flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  // Success state - Password reset
  if (resetSuccess) {
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
                Passord oppdatert!
              </h1>
              <p className="text-stone-500 text-sm">
                Passordet ditt har blitt oppdatert. Du kan nå logge inn med det nye passordet.
              </p>
            </div>

            <div className="w-full">
              <button
                onClick={() => navigate('/login')}
                className="w-full h-11 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                Fortsett til innlogging
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

  // Form state - Reset password
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
              Tilbakestill passord
            </h1>
            <p className="text-stone-500 text-sm">
              Skriv inn det nye passordet ditt.
            </p>
          </div>

          <form className="w-full space-y-5" onSubmit={handleSubmit}>
            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-stone-700"
              >
                Nytt passord
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className={`
                    w-full h-10 px-3 pr-10 rounded-lg border bg-white text-sm text-stone-900 placeholder:text-stone-400
                    transition-all duration-150 outline-none
                    ${
                      touched.password && errors.password
                        ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        : 'border-stone-200 focus:border-stone-900 focus:ring-1 focus:ring-stone-900'
                    }
                  `}
                  placeholder="Minst 8 tegn"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {touched.password && errors.password && (
                <p className="text-xs text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-medium text-stone-700"
              >
                Bekreft passord
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  className={`
                    w-full h-10 px-3 pr-10 rounded-lg border bg-white text-sm text-stone-900 placeholder:text-stone-400
                    transition-all duration-150 outline-none
                    ${
                      touched.confirmPassword && errors.confirmPassword
                        ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        : 'border-stone-200 focus:border-stone-900 focus:ring-1 focus:ring-stone-900'
                    }
                  `}
                  placeholder="Skriv passordet på nytt"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {touched.confirmPassword && errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Password requirements */}
            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
              <p className="text-xs text-stone-600 font-medium mb-1">Passordkrav:</p>
              <ul className="text-xs text-stone-500 space-y-0.5 ml-3">
                <li className="list-disc">Minst 8 tegn</li>
              </ul>
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
                  Oppdaterer...
                </>
              ) : (
                'Oppdater passord'
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

export default ResetPasswordPage;
