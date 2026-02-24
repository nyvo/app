import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Leaf, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useFormValidation } from '@/hooks/use-form-validation';
import { linkGuestBookingsToUser } from '@/services/studentSignups';

const StudentRegisterPage = () => {
  const navigate = useNavigate();
  const { signUp, user, userType } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { formData, errors, touched, setErrors, handleChange, handleBlur, validateForm } =
    useFormValidation({
      initialValues: { fullName: '', email: '', password: '' },
      rules: {
        fullName: {
          validate: (value) => {
            if (!value.trim()) return 'Skriv inn navnet ditt';
            return undefined;
          },
        },
        email: {
          validate: (value) => {
            if (!value.trim()) return 'Skriv inn e-posten din';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Ugyldig e-post';
            return undefined;
          },
        },
        password: {
          validate: (value) => {
            if (!value.trim()) return 'Skriv inn et passord';
            if (value.length < 8) return 'Passord må være minst 8 tegn';
            return undefined;
          },
        },
      },
    });

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
      if (!user?.id || !formData.email) return;

      try {
        await linkGuestBookingsToUser(user.id, formData.email);
      } catch {
        // Silent fail - guest booking linking is not critical
      }
    }

    linkBookings();
  }, [user?.id, formData.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const { error } = await signUp(formData.email, formData.password, formData.fullName);

      if (error) {
        if (error.message.includes('already registered')) {
          setErrors({ email: 'E-posten er allerede registrert' });
        } else {
          setErrors({ general: 'Kontoen ble ikke opprettet. Prøv igjen.' });
        }
        setIsSubmitting(false);
        return;
      }

      // Email confirmation is disabled — session is created immediately.
      // Navigation will happen via useEffect when userType is set.
    } catch {
      setErrors({ general: 'Noe gikk galt. Prøv igjen.' });
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
              {errors.general && (
                <Alert variant="destructive" size="sm" icon={false}>
                  <p className="text-xs text-destructive font-medium">{errors.general}</p>
                </Alert>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Navn <span className="text-destructive">*</span>
                </label>
                <div className="relative group">
                  <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors ${touched.fullName && errors.fullName ? 'text-destructive' : 'text-text-tertiary group-focus-within:text-text-primary'}`} />
                  <Input
                    type="text"
                    placeholder="Ola Nordmann"
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    onBlur={() => handleBlur('fullName')}
                    className={`pl-10 ${touched.fullName && errors.fullName ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive' : ''}`}
                  />
                </div>
                {touched.fullName && errors.fullName && (
                  <p className="text-xs text-destructive font-medium mt-1.5">{errors.fullName}</p>
                )}
              </div>

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
                {touched.password && errors.password ? (
                  <p className="text-xs text-destructive font-medium mt-1.5">{errors.password}</p>
                ) : (
                  <p className={`text-xs flex items-center gap-1 mt-1.5 ${formData.password.length >= 8 ? 'text-success' : 'text-text-tertiary'}`}>
                    {formData.password.length >= 8 && <Check className="w-3 h-3" />}
                    Minst 8 tegn
                  </p>
                )}
              </div>

              {/* Main Action */}
              <Button
                type="submit"
                loading={isSubmitting}
                loadingText="Oppretter konto"
                className="w-full h-11 mt-2"
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
