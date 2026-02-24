import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useFormValidation } from '@/hooks/use-form-validation';
import { linkGuestBookingsToUser } from '@/services/studentSignups';
import { logger } from '@/lib/logger';

const StudentLoginPage = () => {
  const navigate = useNavigate();
  const { signIn, user, profile, userType } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { formData, errors, touched, setErrors, setFormData, handleChange, handleBlur, validateForm } =
    useFormValidation({
      initialValues: { email: '', password: '' },
      rules: {
        email: {
          validate: (value) => {
            if (!value.trim()) return 'Skriv inn e-posten din';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Ugyldig e-post';
            return undefined;
          },
        },
        password: {
          validate: (value) => {
            if (!value.trim()) return 'Skriv inn passordet ditt';
            return undefined;
          },
        },
      },
    });

  // Redirect already-authenticated users to their dashboard
  useEffect(() => {
    if (user && userType === 'student') {
      navigate('/student/dashboard', { replace: true });
    } else if (user && userType === 'teacher') {
      navigate('/teacher', { replace: true });
    }
  }, [user, userType, navigate]);

  // Link guest bookings after user logs in
  useEffect(() => {
    async function linkBookings() {
      if (!user?.id || !profile?.email) return;

      try {
        await linkGuestBookingsToUser(user.id, profile.email);
      } catch (err) {
        logger.warn('Failed to link guest bookings:', err);
      }
    }

    linkBookings();
  }, [user?.id, profile?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const { error } = await signIn(formData.email, formData.password);

      if (error) {
        setErrors({ general: 'Feil e-post eller passord' });
        setFormData(prev => ({ ...prev, password: '' }));
        setIsSubmitting(false);
        return;
      }

      // Success - let useEffect handle navigation when userType is set
    } catch {
      setErrors({ general: 'Noe gikk galt. Prøv igjen.' });
      setFormData(prev => ({ ...prev, password: '' }));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-surface text-sidebar-foreground flex flex-col">
      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-transparent">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
          <Link to="/courses" className="flex items-center gap-3 cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-zinc-200 text-primary">
              <Leaf className="h-5 w-5" />
            </div>
            <span className="font-geist text-lg font-medium text-text-primary tracking-tight">
              Ease
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content: Centered Login Panel */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 pt-24">
        <div className="w-full max-w-[400px] space-y-6">
          {/* Login Card */}
          <div className="rounded-2xl bg-white p-8 border border-zinc-200">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="font-geist text-2xl font-medium text-text-primary tracking-tight">
                Velkommen tilbake
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                Logg inn for å se timene dine
              </p>
            </div>

            {/* Form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Login Error */}
              {errors.general && (
                <Alert variant="destructive" size="sm" icon={false}>
                  <p className="text-xs text-destructive font-medium">{errors.general}</p>
                </Alert>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  E-post <span className="text-destructive">*</span>
                </label>
                <div className="relative group">
                  <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors ${touched.email && errors.email ? 'text-destructive' : 'text-text-tertiary group-focus-within:text-text-primary'}`} />
                  <Input
                    type="email"
                    placeholder="navn@eksempel.no"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={`pl-10 ${touched.email && errors.email ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive' : ''}`}
                  />
                </div>
                {touched.email && errors.email && (
                  <p className="text-xs text-destructive font-medium mt-1.5">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Passord <span className="text-destructive">*</span>
                </label>
                <div className="relative group">
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors ${touched.password && errors.password ? 'text-destructive' : 'text-text-tertiary group-focus-within:text-text-primary'}`} />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    onBlur={() => handleBlur('password')}
                    className={`pl-10 ${touched.password && errors.password ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive' : ''}`}
                  />
                </div>
                {touched.password && errors.password && (
                  <p className="text-xs text-destructive font-medium mt-1.5">Skriv inn passordet ditt</p>
                )}
                {/* Forgot Password Link */}
                <div className="flex justify-end pt-1">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Glemt passord?
                  </Link>
                </div>
              </div>

              {/* Main Action */}
              <Button
                type="submit"
                loading={isSubmitting}
                loadingText="Logger inn"
                className="w-full h-11"
              >
                Logg inn
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-2 text-xs font-medium text-text-tertiary">
                  Eller
                </span>
              </div>
            </div>

            {/* Vipps Button */}
            <Button
              type="button"
              className="w-full rounded-lg bg-vipps px-4 py-3 text-sm font-medium text-white hover:bg-vipps-hover ios-ease active:scale-[0.98]"
            >
              Logg inn med
              <img
                src="/badges/vipps login.svg"
                alt="Vipps"
                className="h-4 w-auto ml-px translate-y-0.5 brightness-0 invert"
              />
            </Button>
          </div>

          {/* Sign Up Footer */}
          <div className="text-center">
            <p className="text-sm text-text-secondary">
              Har du ikke konto?{' '}
              <Link
                to="/student/register"
                className="font-medium text-text-primary hover:text-primary hover:underline underline-offset-4 transition-colors"
              >
                Opprett konto
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentLoginPage;
