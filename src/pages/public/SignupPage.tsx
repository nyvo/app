import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Infinity, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useFormValidation } from '@/hooks/use-form-validation';

const SignupPage = () => {
  const navigate = useNavigate();
  const { signUp, user, isLoading: authLoading } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { formData, errors, touched, setErrors, handleChange, handleBlur, validateForm } =
    useFormValidation({
      initialValues: { fullName: '', email: '', password: '', organizationName: '' },
      rules: {
        fullName: {
          validate: (value) => {
            if (!value.trim()) return 'Skriv inn navnet ditt'
            return undefined
          },
        },
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
        organizationName: {
          validate: (value) => {
            if (!value.trim()) return 'Skriv inn virksomhetsnavnet'
            return undefined
          },
        },
      },
    });

  // Redirect if already logged in (wait for auth to finish loading first)
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/teacher');
    }
  }, [user, authLoading, navigate]);

  // Generate URL-friendly slug from organization name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[æ]/g, 'ae')
      .replace(/[ø]/g, 'o')
      .replace(/[å]/g, 'a')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Check if slug is available
  const checkSlugAvailable = async (slug: string): Promise<boolean> => {
    const { data } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    return !data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      // Step 1: Check if organization slug is available
      const slug = generateSlug(formData.organizationName);
      const isSlugAvailable = await checkSlugAvailable(slug);

      if (!isSlugAvailable) {
        setErrors({ organizationName: 'Dette navnet er allerede i bruk' });
        setIsSubmitting(false);
        return;
      }

      // Step 2: Sign up the user
      const { error: signUpError } = await signUp(
        formData.email,
        formData.password,
        formData.fullName
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

      // Step 3: Store org details for creation after email confirmation + login
      // Email confirmation is ON — no session exists yet, so org creation
      // happens in ProtectedRoute on first authenticated visit.
      localStorage.setItem('pendingOrganization', JSON.stringify({
        name: formData.organizationName,
        slug,
        email: formData.email,
      }));
      navigate('/confirm-email', { state: { email: formData.email } });

    } catch {
      setErrors({ general: 'Noe gikk galt. Prøv igjen.' });
    } finally {
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
              Fyll ut for å komme i gang.
            </p>
          </div>

          <form
            className="w-full max-w-sm space-y-5"
            onSubmit={handleSubmit}
          >
            {/* Full Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="name"
                className="block text-xs font-medium text-text-secondary"
              >
                Navn
              </label>
              <Input
                type="text"
                id="name"
                value={formData.fullName}
                onChange={(e) =>
                  handleChange('fullName', e.target.value)
                }
                onBlur={() => handleBlur('fullName')}
                className={`
                  ${
                    touched.fullName && errors.fullName
                      ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive'
                      : ''
                  }
                `}
                placeholder="Ola Nordmann"
              />
              {touched.fullName && errors.fullName && (
                <p className="text-xs text-destructive">{errors.fullName}</p>
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
              {touched.password && errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Organization Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="organizationName"
                className="block text-xs font-medium text-text-secondary"
              >
                Navn på virksomhet
              </label>
              <Input
                type="text"
                id="organizationName"
                value={formData.organizationName}
                onChange={(e) =>
                  handleChange('organizationName', e.target.value)
                }
                onBlur={() => handleBlur('organizationName')}
                className={`
                  ${
                    touched.organizationName && errors.organizationName
                      ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive'
                      : ''
                  }
                `}
                placeholder="F.eks. Ola Nordmann Yoga"
              />
              {touched.organizationName && errors.organizationName && (
                <p className="text-xs text-destructive">{errors.organizationName}</p>
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
