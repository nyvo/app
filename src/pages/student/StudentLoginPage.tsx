import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Leaf, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { linkGuestBookingsToUser } from '@/services/studentSignups';
import { logger } from '@/lib/logger';

const StudentLoginPage = () => {
  const navigate = useNavigate();
  const { signIn, user, profile, userType } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Redirect already-authenticated students to their dashboard
  // Teachers stay on this page — student login is not for teacher accounts
  useEffect(() => {
    if (user && userType === 'student') {
      navigate('/student/dashboard', { replace: true });
    } else if (user && userType === 'teacher') {
      navigate('/login', { replace: true });
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

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = () => {
    const newErrors: Record<string, boolean> = {};
    let isValid = true;

    if (!email.trim()) {
      newErrors.email = true;
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = true;
      isValid = false;
    }

    if (!password.trim()) {
      newErrors.password = true;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));

    // Validate on blur
    if (field === 'email' && email.trim() && !validateEmail(email)) {
      setErrors(prev => ({ ...prev, email: true }));
    }
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setLoginError(null);

    if (!validateForm()) {
      const firstErrorField = document.querySelector('[aria-invalid="true"]') as HTMLElement;
      if (firstErrorField) {
        firstErrorField.focus();
      }
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        setLoginError('Feil e-post eller passord');
        setIsLoading(false);
        return;
      }

      // Success - clear loading state and let useEffect handle navigation
      setIsLoading(false);
    } catch {
      setLoginError('Noe gikk galt. Prøv igjen.');
      setIsLoading(false);
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
              <p className="mt-2 text-sm text-muted-foreground">
                Logg inn for å se timene dine
              </p>
            </div>

            {/* Form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Login Error */}
              {loginError && (
                <div className="rounded-xl bg-status-error-bg border border-status-error-text/20 p-3">
                  <p className="text-xs text-status-error-text font-medium">{loginError}</p>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  E-post <span className="text-status-error-text">*</span>
                </label>
                <div className="relative group">
                  <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors ${errors.email ? 'text-status-error-text' : 'text-text-tertiary group-focus-within:text-text-primary'}`} />
                  <Input
                    type="email"
                    placeholder="navn@eksempel.no"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                    onBlur={() => handleBlur('email')}
                    aria-invalid={errors.email}
                    className={`pl-10 ${errors.email ? 'border-status-error-text bg-status-error-bg focus:border-status-error-text focus:ring-status-error-text/20' : ''}`}
                  />
                </div>
                {errors.email && touched.email && (
                  <p className="text-xs text-status-error-text font-medium mt-1.5">
                    {!email.trim() ? 'Skriv inn e-posten din' : 'Ugyldig e-post'}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Passord <span className="text-status-error-text">*</span>
                </label>
                <div className="relative group">
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors ${errors.password ? 'text-status-error-text' : 'text-text-tertiary group-focus-within:text-text-primary'}`} />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError('password'); }}
                    onBlur={() => handleBlur('password')}
                    aria-invalid={errors.password}
                    className={`pl-10 ${errors.password ? 'border-status-error-text bg-status-error-bg focus:border-status-error-text focus:ring-status-error-text/20' : ''}`}
                  />
                </div>
                {errors.password && touched.password && (
                  <p className="text-xs text-status-error-text font-medium mt-1.5">Skriv inn passordet ditt</p>
                )}
                {/* Forgot Password Link */}
                <div className="flex justify-end pt-1">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-muted-foreground hover:text-text-primary transition-colors"
                  >
                    Glemt passord?
                  </Link>
                </div>
              </div>

              {/* Main Action */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground ios-ease active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Logger inn
                  </>
                ) : (
                  'Logg inn'
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-2 text-xs font-medium text-text-tertiary uppercase tracking-wide">
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
            <p className="text-sm text-muted-foreground">
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
