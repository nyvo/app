import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Infinity,
  Building2,
  User,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Card images
const CARD_IMAGES = {
  studio: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?auto=format&fit=crop&w=800&q=80',
  teacher: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
};

type UserType = 'studio' | 'teacher';

interface FormData {
  fullName: string;
  email: string;
  password: string;
  organizationName: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  organizationName?: string;
  general?: string;
}

// Animation variants
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
};

const easing: [number, number, number, number] = [0.16, 1, 0.3, 1];

const SignupPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signUp, user } = useAuth();

  // Wizard state
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    password: '',
    organizationName: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/teacher');
    }
  }, [user, navigate]);

  // Check for URL params on mount
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'studio' || type === 'teacher') {
      setUserType(type);
    }
  }, [searchParams]);

  // Navigation handlers
  const handleContinue = () => {
    if (userType) {
      setDirection(1);
      setStep(2);
    }
  };

  const handleBack = () => {
    setDirection(-1);
    setStep(1);
  };

  const handleHeaderBack = () => {
    if (step === 2) {
      handleBack();
    } else {
      navigate('/');
    }
  };

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
      case 'fullName':
        if (!formData.fullName.trim()) {
          newErrors.fullName = 'Fullt navn er påkrevd';
        } else {
          delete newErrors.fullName;
        }
        break;
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
        } else if (formData.password.length < 8) {
          newErrors.password = 'Passord må være minst 8 tegn';
        } else {
          delete newErrors.password;
        }
        break;
      case 'organizationName':
        if (!formData.organizationName.trim()) {
          newErrors.organizationName = userType === 'studio' ? 'Studionavn er påkrevd' : 'Bedriftsnavn er påkrevd';
        } else {
          delete newErrors.organizationName;
        }
        break;
    }

    setErrors(newErrors);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Fullt navn er påkrevd';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-postadresse er påkrevd';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ugyldig e-postadresse';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Passord er påkrevd';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Passord må være minst 8 tegn';
    }

    if (!formData.organizationName.trim()) {
      newErrors.organizationName = userType === 'studio' ? 'Studionavn er påkrevd' : 'Bedriftsnavn er påkrevd';
    }

    setErrors(newErrors);
    setTouched({ fullName: true, email: true, password: true, organizationName: true });
    return Object.keys(newErrors).length === 0;
  };

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
        setErrors({ organizationName: 'En organisasjon med dette navnet finnes allerede' });
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
        // Handle specific error messages
        if (signUpError.message.includes('already registered')) {
          setErrors({ email: 'Denne e-postadressen er allerede registrert' });
        } else {
          setErrors({ general: signUpError.message });
        }
        setIsSubmitting(false);
        return;
      }

      // Step 3: Store org details in localStorage to create after redirect
      localStorage.setItem('pendingOrganization', JSON.stringify({
        name: formData.organizationName,
        slug: slug,
        type: userType
      }));

      // Show success toast
      toast.success('Konto opprettet!');

      // Navigate to dashboard where ProtectedRoute will create the org
      navigate('/teacher', {
        state: { isNewUser: true, accountType: userType, needsOrgCreation: true },
      });

    } catch {
      setErrors({ general: 'Noe gikk galt. Prøv på nytt.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-surface text-text-primary font-geist antialiased flex flex-col selection:bg-gray-200 selection:text-gray-900 overflow-x-hidden">
      {/* Minimal Header */}
      <header className="w-full pt-8 pb-4 px-6 flex items-center justify-between z-50 max-w-6xl mx-auto">
        <div className="w-24">
          <Button 
            variant="outline-soft" 
            size="sm" 
            className="text-text-secondary hover:text-text-primary"
            onClick={handleHeaderBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tilbake
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
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 w-full max-w-2xl mx-auto py-12">
        {/* Wizard Container */}
        <div className="w-full">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: easing }}
                className="w-full flex flex-col items-center"
              >
                {/* Step 1: Selection */}

                <div className="text-center mb-10 space-y-2 max-w-md mx-auto">
                  <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
                    Hvordan vil du bruke Ease?
                  </h1>
                  <p className="text-text-secondary text-sm">
                    Velg den profilen som passer best for deg.
                  </p>
                </div>

                <div className="w-full space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Card A: Yogastudio */}
                    <label className="relative cursor-pointer group">
                      <input
                        type="radio"
                        name="account_type"
                        value="studio"
                        checked={userType === 'studio'}
                        onChange={() => setUserType('studio')}
                        className="peer sr-only"
                      />
                      <div
                        className={`
                          relative overflow-hidden rounded-3xl border bg-white flex flex-col transition-all duration-200 min-h-[400px]
                          ${
                            userType === 'studio'
                              ? 'border-gray-400 bg-surface-elevated shadow-sm ring-2 ring-gray-200'
                              : 'border-border hover:border-gray-300'
                          }
                        `}
                      >
                        {/* Image Section */}
                        <div className="relative h-40 overflow-hidden bg-surface-elevated">
                          <img
                            src={CARD_IMAGES.studio}
                            alt="Yogastudio"
                            className={`
                              w-full h-full object-cover transition-all duration-500 group-hover:scale-105
                              ${userType === 'studio' ? 'opacity-100' : 'opacity-70 saturate-50'}
                            `}
                          />
                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />

                          {/* Selection Marker */}
                          <div className="absolute top-4 right-4 z-20">
                            <div
                              className={`
                                w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-200
                                ${
                                  userType === 'studio'
                                    ? 'bg-gray-900 border-gray-900 text-white scale-110'
                                    : 'border-white/80 bg-white/40 backdrop-blur-sm'
                                }
                              `}
                            >
                              {userType === 'studio' && (
                                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Content Section */}
                        <div className="p-6 flex-grow flex flex-col">
                          <h3 className="font-semibold text-text-primary mb-1 text-lg">
                            Yogastudio
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                            Administrer timeplan og klasser for flere lærere på et fast sted.
                          </p>
                          <div className="mt-auto space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                              <div className={`w-1 h-1 rounded-full transition-all duration-200 ${userType === 'studio' ? 'bg-text-primary' : 'bg-text-tertiary'}`} />
                              Felles timeplan og romstyring
                            </div>
                            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                              <div className={`w-1 h-1 rounded-full transition-all duration-200 ${userType === 'studio' ? 'bg-text-primary' : 'bg-text-tertiary'}`} />
                              Oppsett for lærere på lønn
                            </div>
                            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                              <div className={`w-1 h-1 rounded-full transition-all duration-200 ${userType === 'studio' ? 'bg-text-primary' : 'bg-text-tertiary'}`} />
                              Sentralisert betalingshåndtering
                            </div>
                          </div>
                        </div>
                      </div>
                    </label>

                    {/* Card B: Selvstendig */}
                    <label className="relative cursor-pointer group">
                      <input
                        type="radio"
                        name="account_type"
                        value="teacher"
                        checked={userType === 'teacher'}
                        onChange={() => setUserType('teacher')}
                        className="peer sr-only"
                      />
                      <div
                        className={`
                          relative overflow-hidden rounded-3xl border bg-white flex flex-col transition-all duration-200 min-h-[400px]
                          ${
                            userType === 'teacher'
                              ? 'border-gray-400 bg-surface-elevated shadow-sm ring-2 ring-gray-200'
                              : 'border-border hover:border-gray-300'
                          }
                        `}
                      >
                        {/* Image Section */}
                        <div className="relative h-40 overflow-hidden bg-surface-elevated">
                          <img
                            src={CARD_IMAGES.teacher}
                            alt="Selvstendig lærer"
                            className={`
                              w-full h-full object-cover transition-all duration-500 group-hover:scale-105
                              ${userType === 'teacher' ? 'opacity-100' : 'opacity-70 saturate-50'}
                            `}
                          />
                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />

                          {/* Selection Marker */}
                          <div className="absolute top-4 right-4 z-20">
                            <div
                              className={`
                                w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-200
                                ${
                                  userType === 'teacher'
                                    ? 'bg-gray-900 border-gray-900 text-white scale-110'
                                    : 'border-white/80 bg-white/40 backdrop-blur-sm'
                                }
                              `}
                            >
                              {userType === 'teacher' && (
                                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Content Section */}
                        <div className="p-6 flex-grow flex flex-col">
                          <h3 className="font-semibold text-text-primary mb-1 text-lg">
                            Selvstendig
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                            For lærere som styrer egne klasser og betalinger med full kontroll.
                          </p>
                          <div className="mt-auto space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                              <div className={`w-1 h-1 rounded-full transition-all duration-200 ${userType === 'teacher' ? 'bg-text-primary' : 'bg-text-tertiary'}`} />
                              Full kontroll over egne timer
                            </div>
                            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                              <div className={`w-1 h-1 rounded-full transition-all duration-200 ${userType === 'teacher' ? 'bg-text-primary' : 'bg-text-tertiary'}`} />
                              Direkte utbetalinger til deg
                            </div>
                            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                              <div className={`w-1 h-1 rounded-full transition-all duration-200 ${userType === 'teacher' ? 'bg-text-primary' : 'bg-text-tertiary'}`} />
                              Egen kundeoversikt
                            </div>
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={handleContinue}
                      disabled={!userType}
                      className="w-full md:w-auto min-w-[200px]"
                    >
                      Fortsett <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: easing }}
                className="w-full flex flex-col items-center"
              >
                <div className="text-center mb-8 space-y-2 w-full max-w-sm">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated text-xs font-medium text-text-secondary mb-2">
                    {userType === 'studio' ? (
                      <Building2 className="w-3 h-3" />
                    ) : (
                      <User className="w-3 h-3" />
                    )}
                    {userType === 'studio' ? 'Yogastudio' : 'Lærer'}
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
                    Opprett din konto
                  </h2>
                  <p className="text-text-secondary text-sm">
                    Fyll ut detaljene for å komme i gang.
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
                      Fullt Navn
                    </label>
                    <Input
                      type="text"
                      id="name"
                      value={formData.fullName}
                      onChange={(e) =>
                        handleInputChange('fullName', e.target.value)
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
                        handleInputChange('email', e.target.value)
                      }
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
                        handleInputChange('password', e.target.value)
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
                      {userType === 'studio' ? 'Studionavn' : 'Bedriftsnavn'}
                    </label>
                    <Input
                      type="text"
                      id="organizationName"
                      value={formData.organizationName}
                      onChange={(e) =>
                        handleInputChange('organizationName', e.target.value)
                      }
                      onBlur={() => handleBlur('organizationName')}
                      className={`
                        ${
                          touched.organizationName && errors.organizationName
                            ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive'
                            : ''
                        }
                      `}
                      placeholder={userType === 'studio' ? 'Mitt Yogastudio' : 'Ola Nordmann Yoga'}
                    />
                    {touched.organizationName && errors.organizationName && (
                      <p className="text-xs text-destructive">{errors.organizationName}</p>
                    )}
                  </div>

                  {/* General Error */}
                  {errors.general && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-xs text-destructive">{errors.general}</p>
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
                        Oppretter konto...
                      </>
                    ) : (
                      'Opprett Konto'
                    )}
                  </Button>

                  <p className="text-center text-xs text-text-tertiary pt-2">
                    Ved å klikke opprett konto godtar du våre{' '}
                    <a href="#" className="underline hover:text-text-primary">
                      vilkår
                    </a>
                    .
                  </p>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="py-6 text-center border-t border-border bg-white">
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
