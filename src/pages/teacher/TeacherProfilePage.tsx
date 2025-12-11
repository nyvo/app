import { useState } from 'react';
import {
  User,
  Bell,
  Shield,
  Camera,
  Mail,
  Key,
  SmartphoneNfc,
  ChevronRight,
  Leaf,
  Menu
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';

type Tab = 'profile' | 'notifications' | 'security';

const TeacherProfilePage = () => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // State for form fields (example)
  const [firstName, setFirstName] = useState('Kristoffer');
  const [lastName, setLastName] = useState('Nyvold');
  const [email, setEmail] = useState('kristoffer@ease.no');
  const [bio, setBio] = useState('Sertifisert Vinyasa og Yin Yoga instruktør med over 10 års erfaring. Jeg fokuserer på pust, bevegelse og mindfulness i hver time.');

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
      newErrors.firstName = 'Fornavn er påkrevd';
      isValid = false;
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Etternavn er påkrevd';
      isValid = false;
    }

    if (!email.trim()) {
      newErrors.email = 'E-postadresse er påkrevd';
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = 'Ugyldig e-postadresse';
      isValid = false;
    }

    if (bio.length > 500) {
      newErrors.bio = 'Bio kan ikke være mer enn 500 tegn';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));

    const newErrors = { ...errors };

    if (field === 'firstName' && !firstName.trim()) {
      newErrors.firstName = 'Fornavn er påkrevd';
    } else if (field === 'firstName') {
      delete newErrors.firstName;
    }

    if (field === 'lastName' && !lastName.trim()) {
      newErrors.lastName = 'Etternavn er påkrevd';
    } else if (field === 'lastName') {
      delete newErrors.lastName;
    }

    if (field === 'email') {
      if (!email.trim()) {
        newErrors.email = 'E-postadresse er påkrevd';
      } else if (!validateEmail(email)) {
        newErrors.email = 'Ugyldig e-postadresse';
      } else {
        delete newErrors.email;
      }
    }

    if (field === 'bio' && bio.length > 500) {
      newErrors.bio = 'Bio kan ikke være mer enn 500 tegn';
    } else if (field === 'bio') {
      delete newErrors.bio;
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

  const handleSave = () => {
    setTouched({ firstName: true, lastName: true, email: true, bio: true });

    if (!validateForm()) {
      const firstErrorField = document.querySelector('[aria-invalid="true"]') as HTMLElement;
      if (firstErrorField) {
        firstErrorField.focus();
      }
      return;
    }

    setIsSaving(true);
    // Simulate save
    setTimeout(() => {
      setIsSaving(false);
      // Show success feedback here
    }, 1000);
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
             <span className="font-geist text-base font-semibold text-text-primary">Ease</span>
          </div>
          <SidebarTrigger>
            <Menu className="h-6 w-6 text-muted-foreground" />
          </SidebarTrigger>
        </div>

        <div className="mx-auto max-w-4xl p-6 lg:p-12 pb-24 w-full">

            {/* Header Section */}
            <header className="mb-8">
                <h1 className="font-geist text-3xl md:text-4xl font-medium tracking-tight text-text-primary mb-2">
                    Innstillinger
                </h1>
                <p className="text-sm text-muted-foreground">Administrer din profil, varslinger og konto.</p>
            </header>

            {/* Tabs Navigation */}
            <div className="mb-8 flex w-full md:w-auto overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => switchTab('profile')}
                        className={`flex items-center gap-2 h-10 rounded-lg px-3 py-2 text-xs font-medium ios-ease ${
                            activeTab === 'profile'
                            ? 'border border-border bg-white text-text-primary shadow-sm'
                            : 'border border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                        }`}
                    >
                        <User className="h-3.5 w-3.5" />
                        Profil
                    </button>
                    <button
                        onClick={() => switchTab('notifications')}
                        className={`flex items-center gap-2 h-10 rounded-lg px-3 py-2 text-xs font-medium ios-ease ${
                            activeTab === 'notifications'
                            ? 'border border-border bg-white text-text-primary shadow-sm'
                            : 'border border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                        }`}
                    >
                        <Bell className="h-3.5 w-3.5" />
                        Varslinger
                    </button>
                    <button
                        onClick={() => switchTab('security')}
                        className={`flex items-center gap-2 h-10 rounded-lg px-3 py-2 text-xs font-medium ios-ease ${
                            activeTab === 'security'
                            ? 'border border-border bg-white text-text-primary shadow-sm'
                            : 'border border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                        }`}
                    >
                        <Shield className="h-3.5 w-3.5" />
                        Sikkerhet
                    </button>
                </div>
            </div>

            {/* Tab Content: Profile */}
            {activeTab === 'profile' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

                    {/* Avatar Section */}
                    <div className="rounded-2xl border border-border bg-white p-6 md:p-8 shadow-sm">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                            <div className="relative group">
                                <div className="h-24 w-24 rounded-full bg-surface-elevated flex items-center justify-center text-text-secondary text-2xl font-medium ring-4 ring-sidebar shadow-md">
                                  KN
                                </div>
                                <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-text-primary text-white shadow-lg ring-2 ring-white hover:bg-sidebar-foreground hover:scale-110 transition-all">
                                    <Camera className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="font-geist text-lg font-medium text-text-primary">Profilbilde</h3>
                                <p className="text-sm text-muted-foreground mt-1 mb-4">Dette bildet vil være synlig for studentene dine i timeplanen.</p>
                                <div className="flex items-center justify-center md:justify-start gap-3">
                                    <Button variant="ghost" size="compact">Slett bilde</Button>
                                    <Button size="compact">Last opp nytt</Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Personal Info Form */}
                    <div className="rounded-2xl border border-border bg-white p-6 md:p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-geist text-base font-semibold text-text-primary">Personlig Informasjon</h3>
                            {/* <button className="text-sm font-medium text-primary-accent hover:text-primary">Lagre endringer</button> */}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* First Name */}
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                                  Fornavn <span className="text-status-error-text">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => { setFirstName(e.target.value); clearError('firstName'); }}
                                    onBlur={() => handleBlur('firstName')}
                                    aria-invalid={!!errors.firstName}
                                    className={`w-full h-11 rounded-xl border px-4 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-4 ios-ease ${
                                      errors.firstName
                                        ? 'border-status-error-text bg-status-error-bg focus:border-status-error-text focus:ring-status-error-text/20'
                                        : 'border-border bg-input-bg focus:border-ring focus:ring-border/30 focus:bg-white hover:border-ring'
                                    }`}
                                />
                                {errors.firstName && touched.firstName && (
                                  <p className="text-xs text-status-error-text font-medium mt-1.5">{errors.firstName}</p>
                                )}
                            </div>

                            {/* Last Name */}
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                                  Etternavn <span className="text-status-error-text">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => { setLastName(e.target.value); clearError('lastName'); }}
                                    onBlur={() => handleBlur('lastName')}
                                    aria-invalid={!!errors.lastName}
                                    className={`w-full h-11 rounded-xl border px-4 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-4 ios-ease ${
                                      errors.lastName
                                        ? 'border-status-error-text bg-status-error-bg focus:border-status-error-text focus:ring-status-error-text/20'
                                        : 'border-border bg-input-bg focus:border-ring focus:ring-border/30 focus:bg-white hover:border-ring'
                                    }`}
                                />
                                {errors.lastName && touched.lastName && (
                                  <p className="text-xs text-status-error-text font-medium mt-1.5">{errors.lastName}</p>
                                )}
                            </div>

                            {/* Email */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                                  E-postadresse <span className="text-status-error-text">*</span>
                                </label>
                                <div className="relative">
                                    <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${errors.email ? 'text-status-error-text' : 'text-text-tertiary'}`} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                                        onBlur={() => handleBlur('email')}
                                        aria-invalid={!!errors.email}
                                        className={`w-full h-11 rounded-xl border pl-10 pr-4 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-4 ios-ease ${
                                          errors.email
                                            ? 'border-status-error-text bg-status-error-bg focus:border-status-error-text focus:ring-status-error-text/20'
                                            : 'border-border bg-input-bg focus:border-ring focus:ring-border/30 focus:bg-white hover:border-ring'
                                        }`}
                                    />
                                </div>
                                {errors.email && touched.email ? (
                                  <p className="text-xs text-status-error-text font-medium mt-1.5">{errors.email}</p>
                                ) : (
                                  <p className="text-xs text-text-tertiary mt-1.5">Vi sender deg en bekreftelse hvis du endrer e-posten.</p>
                                )}
                            </div>

                            {/* Bio */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-text-secondary mb-1.5">Om deg (Bio)</label>
                                <textarea
                                    rows={4}
                                    value={bio}
                                    onChange={(e) => { setBio(e.target.value); clearError('bio'); }}
                                    onBlur={() => handleBlur('bio')}
                                    aria-invalid={!!errors.bio}
                                    className={`w-full rounded-xl border px-4 py-2.5 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-4 ios-ease resize-none ${
                                      errors.bio
                                        ? 'border-status-error-text bg-status-error-bg focus:border-status-error-text focus:ring-status-error-text/20'
                                        : 'border-border bg-input-bg focus:border-ring focus:ring-border/30 focus:bg-white hover:border-ring'
                                    }`}
                                />
                                <div className="flex justify-between text-xs mt-1.5">
                                    {errors.bio && touched.bio ? (
                                      <span className="text-status-error-text font-medium">{errors.bio}</span>
                                    ) : (
                                      <span className="text-text-tertiary">Vises på din offentlige instruktørprofil.</span>
                                    )}
                                    <span className={bio.length > 500 ? 'text-status-error-text font-medium' : 'text-text-tertiary'}>{bio.length}/500</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Content: Notifications */}
            {activeTab === 'notifications' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="rounded-2xl border border-border bg-white p-6 md:p-8 shadow-sm">
                        <div className="mb-6">
                            <h3 className="font-geist text-base font-semibold text-text-primary">Varslingsinnstillinger</h3>
                            <p className="text-sm text-muted-foreground mt-1">Velg hvordan og når du vil bli kontaktet.</p>
                        </div>

                        <div className="divide-y divide-surface-elevated">

                            {/* Item 1 */}
                            <div className="flex items-center justify-between py-4">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-text-primary">Nye påmeldinger</span>
                                    <span className="text-xs text-muted-foreground">Få e-post når en student melder seg på din time.</span>
                                </div>
                                <button
                                    onClick={() => handleToggle('newSignups')}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${notifications.newSignups ? 'bg-primary' : 'bg-border'}`}
                                >
                                    <span className="sr-only">Nye påmeldinger</span>
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notifications.newSignups ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>

                            {/* Item 2 */}
                            <div className="flex items-center justify-between py-4">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-text-primary">Avbestillinger</span>
                                    <span className="text-xs text-muted-foreground">Send e-post umiddelbart ved avbestilling (mindre enn 24t).</span>
                                </div>
                                <button
                                    onClick={() => handleToggle('cancellations')}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${notifications.cancellations ? 'bg-primary' : 'bg-border'}`}
                                >
                                    <span className="sr-only">Avbestillinger</span>
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notifications.cancellations ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>

                            {/* Item 3 */}
                            <div className="flex items-center justify-between py-4">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-text-primary">Markedsføring</span>
                                    <span className="text-xs text-muted-foreground">Nyheter, tips og oppdateringer fra Ease på e-post.</span>
                                </div>
                                <button
                                    onClick={() => handleToggle('marketing')}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${notifications.marketing ? 'bg-primary' : 'bg-border'}`}
                                >
                                    <span className="sr-only">Markedsføring</span>
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notifications.marketing ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Content: Security */}
            {activeTab === 'security' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                     <div className="rounded-2xl border border-border bg-white p-6 md:p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-geist text-base font-semibold text-text-primary">Passord & Sikkerhet</h3>
                        </div>

                        <div className="space-y-4">
                            <button className="flex w-full items-center justify-between rounded-xl bg-surface p-4 text-left transition-colors hover:bg-sidebar">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-border">
                                        <Key className="h-5 w-5 text-text-secondary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-text-primary">Endre passord</p>
                                        <p className="text-xs text-muted-foreground">Sist endret for 3 måneder siden</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-text-tertiary" />
                            </button>

                            <button className="flex w-full items-center justify-between rounded-xl bg-surface p-4 text-left transition-colors hover:bg-sidebar">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-border">
                                        <SmartphoneNfc className="h-5 w-5 text-text-secondary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-text-primary">To-faktor autentisering</p>
                                        <p className="text-xs text-muted-foreground">Anbefalt for økt sikkerhet</p>
                                    </div>
                                </div>
                                <span className="rounded-full bg-border px-2 py-1 text-[10px] font-semibold text-text-secondary">Deaktivert</span>
                            </button>
                        </div>
                     </div>

                     {/* Logout Danger Zone */}
                     <div className="rounded-2xl border border-status-error-border bg-status-error-bg p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-status-error-text">Logg ut av alle enheter</h3>
                                <p className="text-xs text-status-error-text/80 mt-1">Dette vil logge deg ut fra mobil, tablet og desktop.</p>
                            </div>
                            <Button variant="destructive" size="compact">
                                Logg ut
                            </Button>
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
                    disabled={isSaving}
                  >
                      {isSaving ? 'Lagrer...' : 'Lagre endringer'}
                  </Button>
              </div>
            )}

        </div>
      </main>
    </SidebarProvider>
  );
};

export default TeacherProfilePage;

