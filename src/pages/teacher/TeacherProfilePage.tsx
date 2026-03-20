import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Mail,
  MapPin,
  Leaf,
  Menu,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { pageVariants, pageTransition } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { updateOrganization } from '@/services/organizations';
import { createStripeConnectLink, createStripeDashboardLink, checkStripeStatus } from '@/services/stripe-connect';
import { typedFrom } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TeacherProfilePage = () => {
  const { profile, currentOrganization, refreshOrganizations } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'system'>('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // State for form fields - initialized from auth context
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [studioDescription, setStudioDescription] = useState('');
  const [city, setCity] = useState('');

  // Load data from auth context on mount
  useEffect(() => {
    if (profile) {
      const nameParts = profile.name?.split(' ') || [];
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setEmail(profile.email || '');
    }
    if (currentOrganization) {
      setStudioDescription(currentOrganization.description || '');
      setCity(currentOrganization.city || '');
    }
  }, [profile, currentOrganization]);

  // Dirty state tracking
  const isDirty = useMemo(() => {
    if (!profile) return false;
    const nameParts = profile.name?.split(' ') || [];
    const origFirst = nameParts[0] || '';
    const origLast = nameParts.slice(1).join(' ') || '';
    const origEmail = profile.email || '';
    const origDesc = currentOrganization?.description || '';
    const origCity = currentOrganization?.city || '';

    return (
      firstName !== origFirst ||
      lastName !== origLast ||
      email !== origEmail ||
      studioDescription !== origDesc ||
      city !== origCity
    );
  }, [profile, currentOrganization, firstName, lastName, email, studioDescription, city]);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!firstName.trim()) {
      newErrors.firstName = 'Skriv inn fornavn';
      isValid = false;
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Skriv inn etternavn';
      isValid = false;
    }

    if (!email.trim()) {
      newErrors.email = 'Skriv inn e-postadresse';
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = 'Ugyldig e-postadresse';
      isValid = false;
    }

    if (studioDescription.length > 500) {
      newErrors.studioDescription = 'Maks 500 tegn';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));

    const newErrors = { ...errors };

    if (field === 'firstName' && !firstName.trim()) {
      newErrors.firstName = 'Skriv inn fornavn';
    } else if (field === 'firstName') {
      delete newErrors.firstName;
    }

    if (field === 'lastName' && !lastName.trim()) {
      newErrors.lastName = 'Skriv inn etternavn';
    } else if (field === 'lastName') {
      delete newErrors.lastName;
    }

    if (field === 'email') {
      if (!email.trim()) {
        newErrors.email = 'Skriv inn e-postadresse';
      } else if (!validateEmail(email)) {
        newErrors.email = 'Ugyldig e-postadresse';
      } else {
        delete newErrors.email;
      }
    }

    if (field === 'studioDescription' && studioDescription.length > 500) {
      newErrors.studioDescription = 'Maks 500 tegn';
    } else if (field === 'studioDescription') {
      delete newErrors.studioDescription;
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

  const handleCancel = () => {
    setIsEditingProfile(false);
    if (profile) {
      const nameParts = profile.name?.split(' ') || [];
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setEmail(profile.email || '');
    }
    if (currentOrganization) {
      setStudioDescription(currentOrganization.description || '');
      setCity(currentOrganization.city || '');
    }
    setErrors({});
    setTouched({});
  };

  const handleSave = async () => {
    setTouched({ firstName: true, lastName: true, email: true, studioDescription: true, city: true });

    if (!validateForm()) {
      const firstErrorField = document.querySelector('[aria-invalid="true"]') as HTMLElement;
      if (firstErrorField) {
        firstErrorField.focus();
      }
      return;
    }

    if (!currentOrganization) {
      toast.error('Fant ikke organisasjonen');
      return;
    }

    setIsSaving(true);

    // Save profile name
    if (profile?.id) {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { error: profileError } = await typedFrom('profiles')
        .update({ name: fullName } as any)
        .eq('id', profile.id);

      if (profileError) {
        toast.error('Kunne ikke lagre profildata');
        setIsSaving(false);
        return;
      }
    }

    // Save organization data (description, city)
    const { error: orgError } = await updateOrganization(currentOrganization.id, {
      description: studioDescription || null,
      city: city || null,
    });

    if (orgError) {
      toast.error('Kunne ikke lagre endringene');
      setIsSaving(false);
      return;
    }

    // Refresh organization data in context
    await refreshOrganizations();

    toast.success('Endringer lagret');
    setIsSaving(false);
    setIsEditingProfile(false);
  };

  // Stripe handlers
  const isStripeConnected = !!currentOrganization?.stripe_onboarding_complete;
  const hasStripeAccount = !!currentOrganization?.stripe_account_id;
  const [stripeLoading, setStripeLoading] = useState(false);
  const [checkingStripeStatus, setCheckingStripeStatus] = useState(false);

  const handleCheckStripeStatus = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setCheckingStripeStatus(true);
    const { data, error } = await checkStripeStatus(currentOrganization.id);
    if (error) {
      toast.error('Kunne ikke sjekke status. Prøv igjen.');
    } else if (data?.onboardingComplete) {
      await refreshOrganizations();
      toast.success('Betalinger er satt opp');
    } else {
      toast('Oppsettet er ikke fullført ennå. Fullfør hos Stripe.');
    }
    setCheckingStripeStatus(false);
  }, [currentOrganization?.id, refreshOrganizations]);

  const handleStripeAction = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setStripeLoading(true);
    if (isStripeConnected) {
      const { data, error } = await createStripeDashboardLink(currentOrganization.id);
      if (error || !data?.url) {
        toast.error(error?.message || 'Kunne ikke åpne Stripe-oversikten');
        setStripeLoading(false);
        return;
      }
      window.location.href = data.url;
      // Don't setStripeLoading(false) — page is navigating away
    } else {
      const { data, error } = await createStripeConnectLink(currentOrganization.id);
      if (error || !data?.url) {
        toast.error(error?.message || 'Kunne ikke opprette Stripe-tilkobling');
        setStripeLoading(false);
        return;
      }
      window.location.href = data.url;
      // Don't setStripeLoading(false) — page is navigating away
    }
  }, [currentOrganization?.id, isStripeConnected, refreshOrganizations]);

  // State for notification toggles
  const [notifications, setNotifications] = useState({
    newSignups: true,
    cancellations: true,
    marketing: false,
  });

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <SidebarProvider>
      <TeacherSidebar />

      <main className="flex-1 overflow-y-auto bg-surface h-screen flex flex-col">
        {/* Mobile Header */}
        <div className="flex md:hidden items-center justify-between p-6 border-b border-border sticky top-0 bg-surface/80 backdrop-blur-xl z-30 shrink-0">
          <div className="flex items-center gap-3">
             <Leaf className="h-5 w-5 text-primary" />
             <span className="font-geist text-base font-medium text-text-primary">Ease</span>
          </div>
          <SidebarTrigger>
            <Menu className="h-6 w-6 text-text-secondary" />
          </SidebarTrigger>
        </div>

        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
          className="mx-auto max-w-3xl px-6 lg:px-8 py-6 lg:py-8 pb-24 w-full"
        >

            {/* Header Section */}
            <header className="mb-8 flex items-start justify-between gap-4">
                <div>
                    <h1 className="font-geist text-2xl font-medium tracking-tight text-text-primary mb-2">
                        Innstillinger
                    </h1>
                    <p className="text-sm text-text-secondary">Administrer din profil, varslinger og konto.</p>
                </div>
                <div className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-surface-elevated flex items-center justify-center text-text-secondary text-lg md:text-xl font-medium ring-2 ring-zinc-200 shrink-0">
                  {firstName && lastName ? `${firstName[0]}${lastName[0]}`.toUpperCase() : profile?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                </div>
            </header>

            {/* Tabs */}
            <div className="flex space-x-1 bg-zinc-100/50 p-1 rounded-xl w-fit mb-8 border border-zinc-200/50">
              {(['profile', 'system'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "relative px-4 py-2 text-sm font-medium rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50",
                    activeTab === tab ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="active-tab"
                      className="absolute inset-0 bg-white rounded-lg shadow-sm border border-zinc-200/50"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{tab === 'profile' ? 'Profil' : 'System'}</span>
                </button>
              ))}
            </div>

            {/* Tab Content: Profile */}
            {activeTab === 'profile' && (
                <div className="space-y-8 animate-in fade-in duration-200">
                  {/* Personal Info Form */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-medium text-text-primary">Personlig informasjon</h2>
                      <Button variant="ghost" size="compact" onClick={() => {
                          if (isEditingProfile) {
                              handleCancel();
                          } else {
                              setIsEditingProfile(true);
                          }
                      }}>
                          {isEditingProfile ? 'Avbryt' : 'Rediger'}
                      </Button>
                    </div>
                    <div className="rounded-xl bg-white p-6 md:p-8 border border-zinc-200">
                      {isEditingProfile ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* First Name */}
                          <div>
                              <label className="block text-xs font-medium text-text-primary mb-1.5">
                                Fornavn <span className="text-destructive">*</span>
                              </label>
                              <Input
                                  type="text"
                                  value={firstName}
                                  onChange={(e) => { setFirstName(e.target.value); clearError('firstName'); }}
                                  onBlur={() => handleBlur('firstName')}
                                  aria-invalid={!!errors.firstName}
                              />
                              {errors.firstName && touched.firstName && (
                                <p className="text-xs text-destructive font-medium mt-1.5">{errors.firstName}</p>
                              )}
                          </div>

                          {/* Last Name */}
                          <div>
                              <label className="block text-xs font-medium text-text-primary mb-1.5">
                                Etternavn <span className="text-destructive">*</span>
                              </label>
                              <Input
                                  type="text"
                                  value={lastName}
                                  onChange={(e) => { setLastName(e.target.value); clearError('lastName'); }}
                                  onBlur={() => handleBlur('lastName')}
                                  aria-invalid={!!errors.lastName}
                              />
                              {errors.lastName && touched.lastName && (
                                <p className="text-xs text-destructive font-medium mt-1.5">{errors.lastName}</p>
                              )}
                          </div>

                          {/* Email */}
                          <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-text-primary mb-1.5">
                                E-postadresse <span className="text-destructive">*</span>
                              </label>
                              <div className="relative group">
                                  <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${errors.email ? 'text-destructive' : 'text-text-tertiary'} group-focus-within:text-text-primary transition-colors pointer-events-none`} />
                                  <Input
                                      type="email"
                                      value={email}
                                      onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                                      onBlur={() => handleBlur('email')}
                                      aria-invalid={!!errors.email}
                                      className="pl-10"
                                  />
                              </div>
                              {errors.email && touched.email ? (
                                <p className="text-xs text-destructive font-medium mt-1.5">{errors.email}</p>
                              ) : (
                                <p className="text-xs text-text-secondary mt-1.5">Vi sender deg en bekreftelse hvis du endrer e-posten.</p>
                              )}
                          </div>

                          {/* City */}
                          <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-text-primary mb-1.5">By / Sted</label>
                              <div className="relative group">
                                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary group-focus-within:text-text-primary transition-colors pointer-events-none" />
                                  <Input
                                      type="text"
                                      value={city}
                                      onChange={(e) => setCity(e.target.value)}
                                      placeholder="F.eks. Oslo"
                                      className="pl-10"
                                  />
                              </div>
                              <p className="text-xs text-text-secondary mt-1.5">Vises på din offentlige studioside.</p>
                          </div>

                          {/* Studio Description */}
                          <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-text-primary mb-1.5">Om studioet</label>
                              <Textarea
                                  rows={6}
                                  value={studioDescription}
                                  onChange={(e) => { setStudioDescription(e.target.value); clearError('studioDescription'); }}
                                  onBlur={() => handleBlur('studioDescription')}
                                  placeholder="Fortell litt om studioet ditt"
                                  aria-invalid={!!errors.studioDescription}
                              />
                              <div className="flex justify-between text-xs mt-1.5">
                                  {errors.studioDescription && touched.studioDescription ? (
                                    <span className="text-destructive font-medium">{errors.studioDescription}</span>
                                  ) : (
                                    <span className="text-text-secondary">Vises på din offentlige studioside.</span>
                                  )}
                                  <span className={studioDescription.length > 500 ? 'text-destructive font-medium' : 'text-text-secondary'}>{studioDescription.length}/500</span>
                              </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                            <div>
                                <span className="block text-xs font-medium text-text-primary mb-1.5">Fornavn</span>
                                <span className="text-sm text-text-primary">{firstName || '—'}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-medium text-text-primary mb-1.5">Etternavn</span>
                                <span className="text-sm text-text-primary">{lastName || '—'}</span>
                            </div>
                            <div className="md:col-span-2">
                                <span className="block text-xs font-medium text-text-primary mb-1.5">E-postadresse</span>
                                <span className="text-sm text-text-primary">{email || '—'}</span>
                            </div>
                            <div className="md:col-span-2">
                                <span className="block text-xs font-medium text-text-primary mb-1.5">By / Sted</span>
                                <span className="text-sm text-text-primary">{city || '—'}</span>
                            </div>
                            <div className="md:col-span-2">
                                <span className="block text-xs font-medium text-text-primary mb-1.5">Om studioet</span>
                                <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{studioDescription || '—'}</p>
                            </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
            )}

            {/* Tab Content: System */}
            {activeTab === 'system' && (
                <div className="space-y-8 animate-in fade-in duration-200">
                  {/* System Action Rows */}
                  <div>
                      <h2 className="text-sm font-medium text-text-primary mb-3">Konto & Sikkerhet</h2>
                      <div className="rounded-xl bg-white border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
                          {/* Betalinger */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-zinc-50 transition-colors gap-4 sm:gap-0">
                              <div className="flex items-center gap-3">
                                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isStripeConnected ? 'bg-status-confirmed-bg' : 'bg-surface-elevated'}`}>
                                      {isStripeConnected ? (
                                          <CheckCircle2 className="h-4 w-4 text-success stroke-[1.5]" />
                                      ) : (
                                          <CreditCard className="h-4 w-4 text-text-tertiary stroke-[1.5]" />
                                      )}
                                  </div>
                                  <div>
                                      <span className="text-sm font-medium text-text-primary block">Betalinger</span>
                                      <span className="text-xs text-text-secondary block">
                                          {isStripeConnected ? 'Tilkoblet Stripe' : 'Knytt kontoen din til Stripe for å motta betaling.'}
                                      </span>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2 sm:ml-4">
                                  {!isStripeConnected && hasStripeAccount && (
                                      <Button
                                          variant="ghost"
                                          size="xs"
                                          onClick={handleCheckStripeStatus}
                                          loading={checkingStripeStatus}
                                          loadingText="Sjekker..."
                                      >
                                          Sjekk status
                                      </Button>
                                  )}
                                  <Button
                                      variant="ghost"
                                      size="compact"
                                      onClick={handleStripeAction}
                                      loading={stripeLoading}
                                      loadingText={isStripeConnected ? 'Åpner...' : 'Sender deg til Stripe …'}
                                      className="text-text-secondary hover:text-text-primary"
                                  >
                                      {isStripeConnected ? 'Se utbetalinger →' : 'Sett opp →'}
                                  </Button>
                              </div>
                          </div>

                          {/* Sikkerhet */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-zinc-50 transition-colors gap-4 sm:gap-0">
                              <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-elevated">
                                      <Shield className="h-4 w-4 text-text-tertiary stroke-[1.5]" />
                                  </div>
                                  <div>
                                      <span className="text-sm font-medium text-text-primary block">Passord & sikkerhet</span>
                                      <span className="text-xs text-text-secondary block">Passordendring og tofaktorinnlogging.</span>
                                  </div>
                              </div>
                              <Button variant="ghost" size="compact" disabled className="text-text-secondary hover:text-text-primary sm:ml-4">
                                  Kommer snart →
                              </Button>
                          </div>
                      </div>
                  </div>

                  {/* Varslinger */}
                  <div>
                      <h2 className="text-sm font-medium text-text-primary mb-3">Varslinger</h2>
                      <div className="rounded-xl bg-white border border-zinc-200 p-4">
                          <p className="text-xs text-text-secondary italic mb-4">Varslingsinnstillinger lagres ikke ennå. Denne funksjonen kommer snart.</p>
                          <div className="divide-y divide-zinc-100">
                              <div className="flex items-center justify-between py-3 first:pt-0">
                                  <div className="flex flex-col">
                                      <span className="text-sm font-medium text-text-primary">Nye påmeldinger</span>
                                      <span className="text-xs text-text-secondary">Få e-post når noen melder seg på kurset ditt.</span>
                                  </div>
                                  <Switch
                                      checked={notifications.newSignups}
                                      onCheckedChange={() => handleToggle('newSignups')}
                                      aria-label="Nye påmeldinger"
                                  />
                              </div>

                              <div className="flex items-center justify-between py-3">
                                  <div className="flex flex-col">
                                      <span className="text-sm font-medium text-text-primary">Avbestillinger</span>
                                      <span className="text-xs text-text-secondary">Send e-post umiddelbart ved avbestilling (under 24t).</span>
                                  </div>
                                  <Switch
                                      checked={notifications.cancellations}
                                      onCheckedChange={() => handleToggle('cancellations')}
                                      aria-label="Avbestillinger"
                                  />
                              </div>

                              <div className="flex items-center justify-between py-3 last:pb-0">
                                  <div className="flex flex-col">
                                      <span className="text-sm font-medium text-text-primary">Markedsføring</span>
                                      <span className="text-xs text-text-secondary">Nyheter, tips og oppdateringer fra Ease på e-post.</span>
                                  </div>
                                  <Switch
                                      checked={notifications.marketing}
                                      onCheckedChange={() => handleToggle('marketing')}
                                      aria-label="Markedsføring"
                                  />
                              </div>
                          </div>
                      </div>
                  </div>
                </div>
            )}

            {/* Global Footer Save (Sticky on Mobile, Static on Desktop) */}
            {isDirty && (
              <div className="fixed bottom-0 left-0 right-0 md:static md:mt-8 bg-white/80 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-t border-border md:border-none p-4 md:p-0 flex justify-end gap-3 z-30">
                  <Button variant="ghost" size="compact" className="hidden md:inline-flex" onClick={handleCancel}>Avbryt</Button>
                  <Button
                    size="compact"
                    className="flex-1 md:flex-none justify-center"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                      {isSaving ? 'Lagrer' : 'Lagre endringer'}
                  </Button>
              </div>
            )}

        </motion.div>
      </main>
    </SidebarProvider>
  );
};

export default TeacherProfilePage;
