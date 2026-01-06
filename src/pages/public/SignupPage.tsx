import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Infinity,
  Building2,
  User,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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

      // Navigate to dashboard where ProtectedRoute will create the org
      navigate('/teacher', {
        state: { isNewUser: true, accountType: userType, needsOrgCreation: true },
      });

    } catch {
      setErrors({ general: 'En uventet feil oppstod. Prøv igjen.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] text-stone-900 font-sans antialiased flex flex-col selection:bg-stone-200 selection:text-stone-900 overflow-x-hidden">
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
                {/* Back to landing */}
                <div className="w-full mb-6">
                  <Link
                    to="/"
                    className="text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-1.5 text-sm font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" /> Tilbake
                  </Link>
                </div>

                <div className="text-center mb-10 space-y-2 max-w-md mx-auto">
                  <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
                    Hvordan vil du bruke Ease?
                  </h1>
                  <p className="text-stone-500 text-sm">
                    Velg den profilen som passer best for deg.
                  </p>
                </div>

                <div className="w-full space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          h-full p-6 rounded-xl border bg-white/50 flex flex-col transition-all duration-200
                          ${
                            userType === 'studio'
                              ? 'border-stone-900 bg-white shadow-sm ring-1 ring-stone-900'
                              : 'border-stone-200 hover:border-stone-300'
                          }
                        `}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-900 border border-stone-200/50">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div
                            className={`
                              w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                              ${
                                userType === 'studio'
                                  ? 'bg-stone-900 border-stone-900'
                                  : 'bg-white border-stone-300'
                              }
                            `}
                          >
                            {userType === 'studio' && (
                              <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            )}
                          </div>
                        </div>
                        <h3 className="font-semibold text-stone-900 mb-2">
                          Yogastudio
                        </h3>
                        <p className="text-sm text-stone-600 leading-relaxed">
                          For deg som driver et studio. Administrer timeplaner,
                          lærere, rom og betalinger på ett sted.
                        </p>
                      </div>
                    </label>

                    {/* Card B: Teacher */}
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
                          h-full p-6 rounded-xl border bg-white/50 flex flex-col transition-all duration-200
                          ${
                            userType === 'teacher'
                              ? 'border-stone-900 bg-white shadow-sm ring-1 ring-stone-900'
                              : 'border-stone-200 hover:border-stone-300'
                          }
                        `}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-900 border border-stone-200/50">
                            <User className="w-5 h-5" />
                          </div>
                          <div
                            className={`
                              w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                              ${
                                userType === 'teacher'
                                  ? 'bg-stone-900 border-stone-900'
                                  : 'bg-white border-stone-300'
                              }
                            `}
                          >
                            {userType === 'teacher' && (
                              <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            )}
                          </div>
                        </div>
                        <h3 className="font-semibold text-stone-900 mb-2">
                          Selvstendig Lærer
                        </h3>
                        <p className="text-sm text-stone-600 leading-relaxed">
                          For deg som underviser. Sett opp dine egne klasser, ta
                          imot betaling og bygg din egen følgerskare.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="flex justify-center pt-4">
                    <button
                      onClick={handleContinue}
                      disabled={!userType}
                      className="w-full md:w-auto min-w-[200px] h-11 bg-stone-900 disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm hover:bg-stone-800"
                    >
                      Fortsett <ArrowRight className="w-4 h-4" />
                    </button>
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
                {/* Back Button */}
                <div className="w-full max-w-sm mb-6">
                  <button
                    onClick={handleBack}
                    className="text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-1.5 text-sm font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" /> Tilbake
                  </button>
                </div>

                <div className="text-center mb-8 space-y-2 w-full max-w-sm">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-xs font-medium text-stone-600 mb-2">
                    {userType === 'studio' ? (
                      <Building2 className="w-3 h-3" />
                    ) : (
                      <User className="w-3 h-3" />
                    )}
                    {userType === 'studio' ? 'Yogastudio' : 'Lærer'}
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
                    Opprett din konto
                  </h2>
                  <p className="text-stone-500 text-sm">
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
                      className="block text-xs font-medium text-stone-700"
                    >
                      Fullt Navn
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.fullName}
                      onChange={(e) =>
                        handleInputChange('fullName', e.target.value)
                      }
                      onBlur={() => handleBlur('fullName')}
                      className={`
                        w-full h-10 px-3 rounded-lg border bg-white text-sm text-stone-900 placeholder:text-stone-400
                        transition-all duration-150 outline-none
                        ${
                          touched.fullName && errors.fullName
                            ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                            : 'border-stone-200 focus:border-stone-900 focus:ring-1 focus:ring-stone-900'
                        }
                      `}
                      placeholder="Ola Nordmann"
                    />
                    {touched.fullName && errors.fullName && (
                      <p className="text-xs text-red-500">{errors.fullName}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="email"
                      className="block text-xs font-medium text-stone-700"
                    >
                      E-post
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange('email', e.target.value)
                      }
                      onBlur={() => handleBlur('email')}
                      className={`
                        w-full h-10 px-3 rounded-lg border bg-white text-sm text-stone-900 placeholder:text-stone-400
                        transition-all duration-150 outline-none
                        ${
                          touched.email && errors.email
                            ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                            : 'border-stone-200 focus:border-stone-900 focus:ring-1 focus:ring-stone-900'
                        }
                      `}
                      placeholder="navn@bedrift.no"
                    />
                    {touched.email && errors.email && (
                      <p className="text-xs text-red-500">{errors.email}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="password"
                      className="block text-xs font-medium text-stone-700"
                    >
                      Passord
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange('password', e.target.value)
                      }
                      onBlur={() => handleBlur('password')}
                      className={`
                        w-full h-10 px-3 rounded-lg border bg-white text-sm text-stone-900 placeholder:text-stone-400
                        transition-all duration-150 outline-none
                        ${
                          touched.password && errors.password
                            ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                            : 'border-stone-200 focus:border-stone-900 focus:ring-1 focus:ring-stone-900'
                        }
                      `}
                      placeholder="••••••••"
                    />
                    {touched.password && errors.password && (
                      <p className="text-xs text-red-500">{errors.password}</p>
                    )}
                  </div>

                  {/* Organization Name */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="organizationName"
                      className="block text-xs font-medium text-stone-700"
                    >
                      {userType === 'studio' ? 'Studionavn' : 'Bedriftsnavn'}
                    </label>
                    <input
                      type="text"
                      id="organizationName"
                      value={formData.organizationName}
                      onChange={(e) =>
                        handleInputChange('organizationName', e.target.value)
                      }
                      onBlur={() => handleBlur('organizationName')}
                      className={`
                        w-full h-10 px-3 rounded-lg border bg-white text-sm text-stone-900 placeholder:text-stone-400
                        transition-all duration-150 outline-none
                        ${
                          touched.organizationName && errors.organizationName
                            ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                            : 'border-stone-200 focus:border-stone-900 focus:ring-1 focus:ring-stone-900'
                        }
                      `}
                      placeholder={userType === 'studio' ? 'Mitt Yogastudio' : 'Ola Nordmann Yoga'}
                    />
                    {touched.organizationName && errors.organizationName && (
                      <p className="text-xs text-red-500">{errors.organizationName}</p>
                    )}
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
                        Oppretter konto...
                      </>
                    ) : (
                      'Opprett Konto'
                    )}
                  </button>

                  <p className="text-center text-xs text-stone-400 pt-2">
                    Ved å klikke opprett konto godtar du våre{' '}
                    <a href="#" className="underline hover:text-stone-900">
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
      <footer className="py-6 text-center border-t border-stone-200/50">
        <p className="text-xs text-stone-400">
          Har du allerede en konto?{' '}
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

export default SignupPage;
