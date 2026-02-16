import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Bell,
  Shield,
  Mail,
  MapPin,
  Leaf,
  Menu
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { pageVariants, pageTransition } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { FilterTabs, FilterTab } from '@/components/ui/filter-tabs';
import { useAuth } from '@/contexts/AuthContext';
import { updateOrganization } from '@/services/organizations';
import { typedFrom } from '@/lib/supabase';
import { toast } from 'sonner';

type Tab = 'profile' | 'notifications' | 'security';

const TeacherProfilePage = () => {
  const { profile, currentOrganization, refreshOrganizations } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

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
        .update({ name: fullName })
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
  };

  // State for notification toggles
  const [notifications, setNotifications] = useState({
    newSignups: true,
    cancellations: true,
    marketing: false,
  });

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
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
          className="mx-auto max-w-4xl p-6 lg:p-12 pb-24 w-full"
        >

            {/* Header Section */}
            <header className="mb-8">
                <h1 className="font-geist text-3xl md:text-4xl font-medium tracking-tight text-text-primary mb-2">
                    Innstillinger
                </h1>
                <p className="text-sm text-text-secondary">Administrer din profil, varslinger og konto.</p>
            </header>

            {/* Tabs Navigation */}
            <div className="mb-8 flex w-full md:w-auto overflow-x-auto no-scrollbar">
                <FilterTabs value={activeTab} onValueChange={(v) => switchTab(v as Tab)}>
                    <FilterTab value="profile" className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />
                        Profil
                    </FilterTab>
                    <FilterTab value="notifications" className="flex items-center gap-2">
                        <Bell className="h-3.5 w-3.5" />
                        Varslinger
                    </FilterTab>
                    <FilterTab value="security" className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5" />
                        Sikkerhet
                    </FilterTab>
                </FilterTabs>
            </div>

            {/* Tab Content: Profile */}
            {activeTab === 'profile' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

                    {/* Avatar Section */}
                    <div className="rounded-2xl bg-white p-6 md:p-8 border border-zinc-200">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                            <div className="relative group">
                                <div className="h-24 w-24 rounded-full bg-surface-elevated flex items-center justify-center text-text-secondary text-2xl font-medium ring-2 ring-zinc-200">
                                  {firstName && lastName ? `${firstName[0]}${lastName[0]}`.toUpperCase() : profile?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                                </div>
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="font-geist text-lg font-medium text-text-primary">Profilbilde</h3>
                                <p className="text-sm text-text-secondary mt-1">Profilbildeopplasting kommer snart.</p>
                            </div>
                        </div>
                    </div>

                    {/* Personal Info Form */}
                    <div className="rounded-2xl bg-white p-6 md:p-8 border border-zinc-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-geist text-base font-medium text-text-primary">Personlig Informasjon</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* First Name */}
                            <div>
                                <label className="block text-xs font-medium text-text-tertiary mb-1.5">
                                  Fornavn <span className="text-status-error-text">*</span>
                                </label>
                                <Input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => { setFirstName(e.target.value); clearError('firstName'); }}
                                    onBlur={() => handleBlur('firstName')}
                                    aria-invalid={!!errors.firstName}
                                />
                                {errors.firstName && touched.firstName && (
                                  <p className="text-xs text-status-error-text font-medium mt-1.5">{errors.firstName}</p>
                                )}
                            </div>

                            {/* Last Name */}
                            <div>
                                <label className="block text-xs font-medium text-text-tertiary mb-1.5">
                                  Etternavn <span className="text-status-error-text">*</span>
                                </label>
                                <Input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => { setLastName(e.target.value); clearError('lastName'); }}
                                    onBlur={() => handleBlur('lastName')}
                                    aria-invalid={!!errors.lastName}
                                />
                                {errors.lastName && touched.lastName && (
                                  <p className="text-xs text-status-error-text font-medium mt-1.5">{errors.lastName}</p>
                                )}
                            </div>

                            {/* Email */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-text-tertiary mb-1.5">
                                  E-postadresse <span className="text-status-error-text">*</span>
                                </label>
                                <div className="relative group">
                                    <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${errors.email ? 'text-status-error-text' : 'text-text-tertiary'} group-focus-within:text-text-primary transition-colors pointer-events-none`} />
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
                                  <p className="text-xs text-status-error-text font-medium mt-1.5">{errors.email}</p>
                                ) : (
                                  <p className="text-xs text-text-tertiary mt-1.5">Vi sender deg en bekreftelse hvis du endrer e-posten.</p>
                                )}
                            </div>

                            {/* City */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-text-tertiary mb-1.5">By / Sted</label>
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
                                <p className="text-xs text-text-tertiary mt-1.5">Vises på din offentlige studioside.</p>
                            </div>

                            {/* Studio Description */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-text-tertiary mb-1.5">Om studioet</label>
                                <Textarea
                                    rows={4}
                                    value={studioDescription}
                                    onChange={(e) => { setStudioDescription(e.target.value); clearError('studioDescription'); }}
                                    onBlur={() => handleBlur('studioDescription')}
                                    placeholder="Fortell litt om studioet ditt"
                                    aria-invalid={!!errors.studioDescription}
                                />
                                <div className="flex justify-between text-xs mt-1.5">
                                    {errors.studioDescription && touched.studioDescription ? (
                                      <span className="text-status-error-text font-medium">{errors.studioDescription}</span>
                                    ) : (
                                      <span className="text-text-tertiary">Vises på din offentlige studioside.</span>
                                    )}
                                    <span className={studioDescription.length > 500 ? 'text-status-error-text font-medium' : 'text-text-tertiary'}>{studioDescription.length}/500</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Content: Notifications */}
            {activeTab === 'notifications' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="rounded-2xl bg-white p-6 md:p-8 border border-zinc-200">
                        <div className="mb-6">
                            <h3 className="font-geist text-base font-medium text-text-primary">Varslingsinnstillinger</h3>
                            <p className="text-sm text-text-secondary mt-1">Velg hvordan og når du vil bli kontaktet.</p>
                            <p className="text-xs text-text-secondary mt-2 italic">Varslingsinnstillinger lagres ikke ennå. Denne funksjonen kommer snart.</p>
                        </div>

                        <div className="divide-y divide-surface-elevated">

                            {/* Item 1 */}
                            <div className="flex items-center justify-between py-4">
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

                            {/* Item 2 */}
                            <div className="flex items-center justify-between py-4">
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

                            {/* Item 3 */}
                            <div className="flex items-center justify-between py-4">
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
            )}

            {/* Tab Content: Security */}
            {activeTab === 'security' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                     <div className="rounded-2xl bg-white p-6 md:p-8 border border-zinc-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-geist text-base font-medium text-text-primary">Passord & Sikkerhet</h3>
                        </div>

                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated mb-4">
                            <Shield className="h-6 w-6 text-text-tertiary" />
                          </div>
                          <p className="text-sm font-medium text-text-primary mb-1">Sikkerhetsinnstillinger kommer snart</p>
                          <p className="text-xs text-text-secondary max-w-[280px]">
                            Passordendring og to-faktor autentisering vil være tilgjengelig i en fremtidig oppdatering.
                          </p>
                        </div>
                     </div>
                </div>
            )}

            {/* Global Footer Save (Sticky on Mobile, Static on Desktop) */}
            {activeTab === 'profile' && (
              <div className="fixed bottom-0 left-0 right-0 md:static md:mt-8 bg-white/80 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-t border-border md:border-none p-4 md:p-0 flex justify-end gap-3 z-30">
                  <Button variant="ghost" size="compact" className="hidden md:inline-flex">Avbryt</Button>
                  <Button
                    size="compact"
                    className="flex-1 md:flex-none justify-center"
                    onClick={handleSave}
                    disabled={isSaving || !isDirty}
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
