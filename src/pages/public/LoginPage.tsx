import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Infinity, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

const easing: [number, number, number, number] = [0.16, 1, 0.3, 1];

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, user, isLoading: authLoading } = useAuth();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/teacher');
    }
  }, [user, authLoading, navigate]);

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
      case 'email':
        if (!formData.email.trim()) {
          newErrors.email = 'E-postadresse er påkrevd';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Ugyldig e-postadresse';
        } else {
          delete newErrors.email;
        }
        break;
      case 'password':
        if (!formData.password.trim()) {
          newErrors.password = 'Passord er påkrevd';
        } else {
          delete newErrors.password;
        }
        break;
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

    if (!formData.password.trim()) {
      newErrors.password = 'Passord er påkrevd';
    }

    setErrors(newErrors);
    setTouched({ email: true, password: true });
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const { error } = await signIn(formData.email, formData.password);

      if (error) {
        // Handle specific error messages
        if (error.message.includes('Invalid login credentials')) {
          setErrors({ general: 'Feil e-post eller passord' });
        } else if (error.message.includes('Email not confirmed')) {
          setErrors({ general: 'Vennligst bekreft e-posten din før du logger inn' });
        } else {
          setErrors({ general: error.message });
        }
        setIsSubmitting(false);
        return;
      }

      // Sign in successful - navigate directly
      // The auth state will update in the background
      navigate('/teacher');
    } catch (err) {
      setErrors({ general: 'En uventet feil oppstod. Prøv igjen.' });
      setIsSubmitting(false);
    }
    // Don't reset isSubmitting on success - we're navigating away
  };

  return (
    <div className="min-h-screen w-full bg-surface text-text-primary font-geist antialiased flex flex-col selection:bg-gray-200 selection:text-gray-900">
      {/* Minimal Header */}
      <header className="w-full pt-8 pb-4 px-6 flex items-center justify-between z-50 max-w-6xl mx-auto">
        <div className="w-24">
          <Button variant="outline-soft" size="sm" className="text-text-secondary hover:text-text-primary" asChild>
            <Link to="/">
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

        <div className="w-24" /> {/* Spacer for centering */}
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
              Velkommen tilbake
            </h1>
            <p className="text-text-secondary text-sm">
              Logg inn for å fortsette til dashboardet.
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
              <Input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                className={`
                  ${
                    touched.email && errors.email
                      ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive'
                      : ''
                  }
                `}
                placeholder="navn@bedrift.no"
              />
              {touched.email && errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-text-secondary"
                >
                  Passord
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
                >
                  Glemt passord?
                </Link>
              </div>
              <Input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                className={`
                  ${
                    touched.password && errors.password
                      ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive'
                      : ''
                  }
                `}
                placeholder="••••••••"
              />
              {touched.password && errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            {/* General Error */}
            {errors.general && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-destructive">{errors.general}</p>
                {errors.general === 'Feil e-post eller passord' && (
                  <Link
                    to="/forgot-password"
                    className="text-xs text-destructive underline hover:text-destructive/80 mt-1.5 inline-block"
                  >
                    Tilbakestill passord
                  </Link>
                )}
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
                  Logger inn...
                </>
              ) : (
                'Logg inn'
              )}
            </Button>
          </form>
        </motion.div>
      </main>

      {/* Simple Footer */}
      <footer className="py-6 text-center border-t border-border bg-white">
        <p className="text-xs text-text-tertiary">
          Har du ikke en konto?{' '}
          <Link
            to="/signup"
            className="text-text-primary font-medium hover:underline"
          >
            Opprett konto
          </Link>
        </p>
      </footer>
    </div>
  );
};

export default LoginPage;
