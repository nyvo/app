import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Infinity, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { authPageVariants, authPageTransition } from '@/lib/motion';
import { useFormValidation } from '@/hooks/use-form-validation';

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, user, isLoading: authLoading } = useAuth();

  const { formData, errors, touched, setFormData, setErrors, handleChange, handleBlur, validateForm } =
    useFormValidation({
      initialValues: { email: '', password: '' },
      rules: {
        email: {
          validate: (value) => {
            if (!value.trim()) return 'Skriv inn e-posten din'
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Sjekk at e-posten er riktig'
            return undefined
          },
        },
        password: {
          validate: (value) => {
            if (!value.trim()) return 'Skriv inn passordet ditt'
            return undefined
          },
        },
      },
    });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/teacher');
    }
  }, [user, authLoading, navigate]);

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
          setErrors({ general: 'E-post eller passord stemmer ikke' });
        } else if (error.message.includes('Email not confirmed')) {
          navigate('/confirm-email', { state: { email: formData.email } });
          return;
        } else {
          setErrors({ general: error.message });
        }
        setFormData(prev => ({ ...prev, password: '' }));
        setIsSubmitting(false);
        return;
      }

      // Sign in successful - navigate directly
      // The auth state will update in the background
      navigate('/teacher');
    } catch {
      setErrors({ general: 'Noe gikk galt. Prøv igjen.' });
      setFormData(prev => ({ ...prev, password: '' }));
      setIsSubmitting(false);
    }
    // Don't reset isSubmitting on success - we're navigating away
  };

  return (
    <div className="min-h-screen w-full bg-surface text-text-primary font-geist antialiased flex flex-col selection:bg-zinc-200 selection:text-zinc-900">
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
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-white">
            <Infinity className="w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-medium tracking-tighter text-text-primary">
            Ease
          </span>
        </Link>

        <div className="w-24" /> {/* Spacer for centering */}
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
                onChange={(e) => handleChange('email', e.target.value)}
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
                onChange={(e) => handleChange('password', e.target.value)}
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
              <Alert variant="destructive" size="sm" icon={false}>
                <p className="text-xs text-destructive">{errors.general}</p>
                {errors.general === 'E-post eller passord stemmer ikke' && (
                  <Link
                    to="/forgot-password"
                    className="text-xs text-destructive underline hover:text-destructive/80 mt-1.5 inline-block"
                  >
                    Tilbakestill passord
                  </Link>
                )}
              </Alert>
            )}

            <Button
              type="submit"
              loading={isSubmitting}
              loadingText="Logger inn"
              className="w-full h-11 mt-2"
            >
              Logg inn
            </Button>
          </form>
        </motion.div>
      </main>

      {/* Simple Footer */}
      <footer className="py-6 text-center border-t border-border bg-surface">
        <p className="text-xs text-text-tertiary">
          Har du ikke konto?{' '}
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
