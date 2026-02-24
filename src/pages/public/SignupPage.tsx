import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Infinity, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useFormValidation } from '@/hooks/use-form-validation';

/** Generate URL-friendly slug from organization name */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[æ]/g, 'ae')
    .replace(/[ø]/g, 'o')
    .replace(/[å]/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const SignupPage = () => {
  const navigate = useNavigate();
  const { signUp, ensureOrganization, user, isLoading: authLoading, currentOrganization } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { formData, errors, touched, setErrors, handleChange, handleBlur, validateForm } =
    useFormValidation({
      initialValues: { email: '', password: '', studioName: '' },
      rules: {
        email: {
          validate: (value) => {
            if (!value.trim()) return 'Skriv inn e-posten din'
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Ugyldig e-post'
            return undefined
          },
        },
        password: {
          validate: (value) => {
            if (!value.trim()) return 'Skriv inn et passord'
            if (value.length < 8) return 'Passord må være minst 8 tegn'
            return undefined
          },
        },
        studioName: {
          validate: (value) => {
            if (!value.trim()) return 'Skriv inn navnet på studioet'
            return undefined
          },
        },
      },
    });

  // Redirect if already logged in with org
  useEffect(() => {
    if (user && !authLoading && currentOrganization) {
      navigate('/teacher', { replace: true });
    }
  }, [user, authLoading, currentOrganization, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      // Step 1: Create user account
      const { error: signUpError } = await signUp(
        formData.email,
        formData.password,
        formData.studioName.trim()
      );

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setErrors({ email: 'E-posten er allerede registrert' });
        } else {
          setErrors({ general: signUpError.message });
        }
        setIsSubmitting(false);
        return;
      }

      // Step 2: Create organization (idempotent RPC)
      const slug = generateSlug(formData.studioName);
      const { error: orgError } = await ensureOrganization(formData.studioName.trim(), slug);

      if (orgError) {
        setErrors({ general: 'Kontoen ble opprettet, men studioet kunne ikke opprettes. Prøv å logge inn.' });
        setIsSubmitting(false);
        return;
      }

      // Step 3: Navigate to teacher dashboard
      navigate('/teacher', { replace: true });

    } catch {
      setErrors({ general: 'Noe gikk galt. Prøv igjen.' });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-surface text-text-primary font-geist antialiased flex flex-col selection:bg-zinc-200 selection:text-zinc-900 overflow-x-hidden">
      {/* Minimal Header */}
      <header className="w-full pt-8 pb-4 px-6 flex items-center justify-between z-50 max-w-6xl mx-auto">
        <div className="w-24">
          <Button
            variant="outline-soft"
            size="sm"
            className="text-text-secondary hover:text-text-primary"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tilbake
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
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 w-full max-w-2xl mx-auto py-12">
        <div className="w-full flex flex-col items-center">
          <div className="text-center mb-8 space-y-2 w-full max-w-sm">
            <h2 className="text-2xl font-medium tracking-tight text-text-primary">
              Opprett din konto
            </h2>
            <p className="text-text-secondary text-sm">
              Opprett konto og kom i gang med studioet ditt.
            </p>
          </div>

          <form
            className="w-full max-w-sm space-y-5"
            onSubmit={handleSubmit}
          >
            {/* Studio Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="studioName"
                className="block text-xs font-medium text-text-secondary"
              >
                Navn på studio eller virksomhet
              </label>
              <Input
                type="text"
                id="studioName"
                value={formData.studioName}
                onChange={(e) =>
                  handleChange('studioName', e.target.value)
                }
                onBlur={() => handleBlur('studioName')}
                className={`
                  ${
                    touched.studioName && errors.studioName
                      ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive'
                      : ''
                  }
                `}
                placeholder="F.eks. Yoga med Ola"
              />
              {touched.studioName && errors.studioName ? (
                <p className="text-xs text-destructive">{errors.studioName}</p>
              ) : (
                <p className="text-xs text-text-tertiary">
                  Vises på din offentlige side. Du kan endre det senere.
                </p>
              )}
            </div>

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
                onChange={(e) =>
                  handleChange('email', e.target.value)
                }
                onBlur={() => handleBlur('email')}
                className={`
                  ${
                    touched.email && errors.email
                      ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive'
                      : ''
                  }
                `}
                placeholder="namn@bedrift.no"
              />
              {touched.email && errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-text-secondary"
              >
                Passord
              </label>
              <Input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) =>
                  handleChange('password', e.target.value)
                }
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
              {touched.password && errors.password ? (
                <p className="text-xs text-destructive">{errors.password}</p>
              ) : formData.password.length < 8 ? (
                <p className="text-xs text-text-tertiary">
                  Minst 8 tegn
                </p>
              ) : null}
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
              loadingText="Oppretter konto..."
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
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="py-6 text-center border-t border-border bg-surface">
        <p className="text-xs text-text-tertiary">
          Har du allerede en konto?{' '}
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

export default SignupPage;
