import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, CheckCircle2, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { linkGuestBookingsToUser } from '@/services/studentSignups';
import { toast } from 'sonner';

const StudentRegisterPage = () => {
  const navigate = useNavigate();
  const { signUp, user, userType } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Redirect already-authenticated users to their appropriate dashboard
  useEffect(() => {
    if (user && userType) {
      if (userType === 'student') {
        navigate('/student/dashboard', { replace: true });
      } else if (userType === 'teacher') {
        navigate('/teacher', { replace: true });
      }
    }
  }, [user, userType, navigate]);

  // Link guest bookings after user is created
  useEffect(() => {
    async function linkBookings() {
      if (!user?.id || !email) return;

      try {
        await linkGuestBookingsToUser(user.id, email);
      } catch {
        // Silent fail - guest booking linking is not critical
      }
    }

    linkBookings();
  }, [user?.id, email]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!fullName.trim()) {
      newErrors.fullName = 'Skriv inn navnet ditt';
      isValid = false;
    }

    if (!email.trim()) {
      newErrors.email = 'Skriv inn e-posten din';
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = 'Ugyldig e-post';
      isValid = false;
    }

    if (!password.trim()) {
      newErrors.password = 'Skriv inn et passord';
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Minst 8 tegn';
      isValid = false;
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Gjenta passordet';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passordene er ikke like';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));

    const newErrors = { ...errors };

    if (field === 'email' && email.trim() && !validateEmail(email)) {
      newErrors.email = 'Ugyldig e-post';
    } else if (field === 'email' && validateEmail(email)) {
      delete newErrors.email;
    }

    if (field === 'confirmPassword' && confirmPassword.trim() && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passordene er ikke like';
    } else if (field === 'confirmPassword' && password === confirmPassword && confirmPassword.trim()) {
      delete newErrors.confirmPassword;
    }

    if (field === 'password' && password.trim() && password.length < 8) {
      newErrors.password = 'Minst 8 tegn';
    } else if (field === 'password' && password.length >= 8) {
      delete newErrors.password;
    }

    setErrors(newErrors);
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true });
    setRegisterError(null);

    if (!validateForm()) {
      const firstErrorField = document.querySelector('[aria-invalid="true"]') as HTMLElement;
      if (firstErrorField) {
        firstErrorField.focus();
      }
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp(email, password, fullName);

      if (error) {
        if (error.message.includes('already registered')) {
          setRegisterError('E-posten er allerede registrert');
        } else {
          setRegisterError('Kontoen ble ikke opprettet. Prøv igjen.');
        }
        setIsLoading(false);
        return;
      }

      toast.success('Konto opprettet', {
        description: 'Sjekk e-posten din for å bekrefte kontoen.',
      });

      // Navigation will happen automatically via useEffect when userType is set
    } catch {
      setRegisterError('Noe gikk galt. Prøv igjen.');
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

      {/* Main Content: Centered Registration Panel */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 pt-24">
        <div className="w-full max-w-[400px] space-y-6">
          {/* Registration Card */}
          <div className="rounded-2xl bg-white p-8 border border-zinc-200">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="font-geist text-2xl font-medium text-text-primary tracking-tight">
                Opprett konto
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                Se timene dine og book enkelt
              </p>
            </div>

            {/* Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Registration Error */}
              {registerError && (
                <Alert variant="error" size="sm" icon={false}>
                  <p className="text-xs text-status-error-text font-medium">{registerError}</p>
                </Alert>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Navn <span className="text-status-error-text">*</span>
                </label>
                <div className="relative group">
                  <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors ${errors.fullName ? 'text-status-error-text' : 'text-text-tertiary group-focus-within:text-text-primary'}`} />
                  <Input
                    type="text"
                    placeholder="Ola Nordmann"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); clearError('fullName'); }}
                    onBlur={() => handleBlur('fullName')}
                    aria-invalid={!!errors.fullName}
                    className={`pl-10 ${errors.fullName ? 'border-status-error-text bg-status-error-bg focus:border-status-error-text focus:ring-status-error-text/20' : ''}`}
                  />
                </div>
                {errors.fullName && touched.fullName && (
                  <p className="text-xs text-status-error-text font-medium mt-1.5">{errors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
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
                    aria-invalid={!!errors.email}
                    className={`pl-10 ${errors.email ? 'border-status-error-text bg-status-error-bg focus:border-status-error-text focus:ring-status-error-text/20' : ''}`}
                  />
                </div>
                {errors.email && touched.email && (
                  <p className="text-xs text-status-error-text font-medium mt-1.5">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
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
                    aria-invalid={!!errors.password}
                    className={`pl-10 ${errors.password ? 'border-status-error-text bg-status-error-bg focus:border-status-error-text focus:ring-status-error-text/20' : ''}`}
                  />
                </div>
                {errors.password && touched.password ? (
                  <p className="text-xs text-status-error-text font-medium mt-1.5">{errors.password}</p>
                ) : (
                  <p className="text-xs text-text-tertiary mt-1.5">Minst 8 tegn</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Gjenta passord <span className="text-status-error-text">*</span>
                </label>
                <div className="relative group">
                  <CheckCircle2 className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors ${errors.confirmPassword ? 'text-status-error-text' : confirmPassword && password === confirmPassword ? 'text-status-confirmed-text' : 'text-text-tertiary group-focus-within:text-text-primary'}`} />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); clearError('confirmPassword'); }}
                    onBlur={() => handleBlur('confirmPassword')}
                    aria-invalid={!!errors.confirmPassword}
                    className={`pl-10 ${errors.confirmPassword ? 'border-status-error-text bg-status-error-bg focus:border-status-error-text focus:ring-status-error-text/20' : confirmPassword && password === confirmPassword ? 'border-status-confirmed-text bg-status-confirmed-bg' : ''}`}
                  />
                </div>
                {errors.confirmPassword && touched.confirmPassword && (
                  <p className="text-xs text-status-error-text font-medium mt-1.5">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Main Action */}
              <Button
                type="submit"
                loading={isLoading}
                loadingText="Oppretter konto"
                className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground ios-ease active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                Opprett konto
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
              Opprett konto med
              <img
                src="/badges/vipps login.svg"
                alt="Vipps"
                className="h-4 w-auto ml-px translate-y-0.5 brightness-0 invert"
              />
            </Button>
          </div>

          {/* Login Footer */}
          <div className="text-center">
            <p className="text-sm text-text-secondary">
              Har du allerede en konto?{' '}
              <Link
                to="/student/login"
                className="font-medium text-text-primary hover:text-primary hover:underline underline-offset-4 transition-colors"
              >
                Logg inn
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentRegisterPage;
