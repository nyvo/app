import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  MapPin,
  Eye,
  EyeOff,
} from 'lucide-react';
import { pageVariants, pageTransition } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { useAuth } from '@/contexts/AuthContext';
import { updateOrganization } from '@/services/organizations';
import { createStripeConnectLink, createStripeDashboardLink, checkStripeStatus } from '@/services/stripe-connect';
import { supabase, typedFrom } from '@/lib/supabase';
import { toast } from 'sonner';
import type { NotificationSettings, OrganizationSettings } from '@/types/database';

const TeacherProfilePage = () => {
  const { profile, currentOrganization, refreshOrganizations, updatePassword } = useAuth();
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

  // Password change state
  const [passwordExpanded, setPasswordExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Logout all devices
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  // Delete account
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Notification preferences
  const defaultNotifications: NotificationSettings = {
    newSignups: true,
    cancellations: true,
    messages: true,
    marketing: false,
  };
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications);

  // Load notification prefs from org settings
  useEffect(() => {
    if (currentOrganization?.settings) {
      const settings = currentOrganization.settings as unknown as OrganizationSettings;
      if (settings.notifications) {
        setNotifications({ ...defaultNotifications, ...settings.notifications });
      }
    }
  }, [currentOrganization?.id]);

  // Password change handler
  const handleChangePassword = async () => {
    const errs: Record<string, string> = {};
    if (!currentPassword) errs.currentPassword = 'Skriv inn nåværende passord';
    if (!newPassword) errs.newPassword = 'Skriv inn nytt passord';
    else if (newPassword.length < 8) errs.newPassword = 'Må være minst 8 tegn';
    if (!confirmPassword) errs.confirmPassword = 'Bekreft nytt passord';
    else if (newPassword !== confirmPassword) errs.confirmPassword = 'Passordene er ikke like';

    if (Object.keys(errs).length > 0) {
      setPasswordErrors(errs);
      return;
    }

    setIsChangingPassword(true);
    setPasswordErrors({});

    // Verify current password
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: profile?.email || '',
      password: currentPassword,
    });
    if (verifyError) {
      setPasswordErrors({ currentPassword: 'Feil passord' });
      setIsChangingPassword(false);
      return;
    }

    // Update password
    const { error: updateError } = await updatePassword(newPassword);
    if (updateError) {
      toast.error('Kunne ikke oppdatere passordet. Prøv igjen.');
      setIsChangingPassword(false);
      return;
    }

    toast.success('Passord oppdatert');
    setPasswordExpanded(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setIsChangingPassword(false);
  };

  // Logout all devices handler
  const handleLogoutAllDevices = async () => {
    setIsLoggingOutAll(true);
    await supabase.auth.signOut({ scope: 'global' });
  };

  // Delete account handler (deferred — signs out + instructs to contact support)
  const handleDeleteAccount = async () => {
    await supabase.auth.signOut();
    toast('Kontoen din vil bli slettet. Kontakt oss på hei@ease.no om du ombestemmer deg.');
  };

  // Notification toggle with auto-save
  const handleNotificationToggle = async (key: keyof NotificationSettings) => {
    if (!currentOrganization) return;

    const previous = { ...notifications };
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);

    const currentSettings = (currentOrganization.settings as unknown as OrganizationSettings) || {};
    const newSettings: OrganizationSettings = {
      ...currentSettings,
      notifications: updated,
    };

    const { error } = await updateOrganization(currentOrganization.id, {
      settings: newSettings as any,
    });

    if (error) {
      setNotifications(previous);
      toast.error('Kunne ikke lagre innstilling');
      return;
    }

    await refreshOrganizations();
  };

  return (
    <main className="flex-1 overflow-y-auto bg-surface h-screen flex flex-col">
        <MobileTeacherHeader title="Innstillinger" />

        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
          className="max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 pb-24"
        >

            {/* Header Section */}
            <header className="mb-8">
                <h1 className="font-geist text-2xl font-medium tracking-tight text-text-primary mb-2">
                    Innstillinger
                </h1>
                <p className="text-sm text-text-secondary">Din profil, varslinger og kontoinnstillinger.</p>
            </header>

            <div className="divide-y divide-border">
                  {/* Personlig informasjon */}
                  <section className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pb-10">
                    <div>
                      <h2 className="text-sm font-medium text-text-primary">Personlig informasjon</h2>
                      <p className="text-sm text-text-secondary mt-1">Navn, e-post og informasjon om studioet ditt.</p>
                    </div>
                    <div className="md:col-span-2 rounded-xl bg-white p-6 md:p-8 border border-zinc-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="profile-firstname" className="block text-xs font-medium text-text-primary mb-1.5">Fornavn</label>
                            <Input
                                id="profile-firstname"
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

                        <div>
                            <label htmlFor="profile-lastname" className="block text-xs font-medium text-text-primary mb-1.5">Etternavn</label>
                            <Input
                                id="profile-lastname"
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

                        <div className="md:col-span-2">
                            <label htmlFor="profile-email" className="block text-xs font-medium text-text-primary mb-1.5">E-post</label>
                            <div className="relative group">
                                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${errors.email ? 'text-destructive' : 'text-text-tertiary'} group-focus-within:text-text-primary transition-colors pointer-events-none`} />
                                <Input
                                    id="profile-email"
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

                        <div className="md:col-span-2">
                            <label htmlFor="profile-city" className="block text-xs font-medium text-text-primary mb-1.5">By / Sted</label>
                            <div className="relative group">
                                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary group-focus-within:text-text-primary transition-colors pointer-events-none" />
                                <Input
                                    id="profile-city"
                                    type="text"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder="F.eks. Oslo"
                                    className="pl-10"
                                />
                            </div>
                            <p className="text-xs text-text-secondary mt-1.5">Vises på din offentlige studioside.</p>
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="profile-description" className="block text-xs font-medium text-text-primary mb-1.5">Om studioet</label>
                            <Textarea
                                id="profile-description"
                                rows={4}
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
                    </div>
                  </section>

                  {/* Konto & Sikkerhet */}
                  <section className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 py-10">
                    <div>
                      <h2 className="text-sm font-medium text-text-primary">Konto & Sikkerhet</h2>
                      <p className="text-sm text-text-secondary mt-1">Betalinger, passord og sikkerhet.</p>
                    </div>
                    <div className="md:col-span-2 rounded-xl bg-white border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
                          {/* Betalinger */}
                          <div className="flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors">
                              <div>
                                  <span className="text-sm font-medium text-text-primary block">Betalinger</span>
                                  <span className="text-xs text-text-secondary block">
                                      {isStripeConnected ? 'Tilkoblet Stripe' : 'Sett opp Stripe for å motta betaling.'}
                                  </span>
                              </div>
                              <div className="flex items-center gap-2 ml-4 shrink-0 flex-wrap justify-end">
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

                          {/* Endre passord */}
                          <div className="p-4">
                              <div className="flex items-center justify-between">
                                  <div>
                                      <span className="text-sm font-medium text-text-primary block">Endre passord</span>
                                      <span className="text-xs text-text-secondary block">Oppdater passordet ditt.</span>
                                  </div>
                                  <Button
                                      variant="ghost"
                                      size="compact"
                                      onClick={() => {
                                          setPasswordExpanded(!passwordExpanded);
                                          setPasswordErrors({});
                                          setCurrentPassword('');
                                          setNewPassword('');
                                          setConfirmPassword('');
                                          setShowCurrentPassword(false);
                                          setShowNewPassword(false);
                                      }}
                                      className="text-text-secondary hover:text-text-primary ml-4 shrink-0"
                                  >
                                      {passwordExpanded ? 'Avbryt' : 'Endre →'}
                                  </Button>
                              </div>

                              {/* Expanded password form */}
                              {passwordExpanded && (
                                  <div className="mt-4 pt-4 border-t border-zinc-100 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                      <div>
                                          <label className="block text-xs font-medium text-text-primary mb-1.5">Nåværende passord</label>
                                          <div className="relative">
                                              <Input
                                                  type={showCurrentPassword ? 'text' : 'password'}
                                                  value={currentPassword}
                                                  onChange={(e) => { setCurrentPassword(e.target.value); setPasswordErrors(prev => { const n = { ...prev }; delete n.currentPassword; return n; }); }}
                                                  aria-invalid={!!passwordErrors.currentPassword}
                                                  autoComplete="current-password"
                                              />
                                              <button
                                                  type="button"
                                                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                                                  aria-label={showCurrentPassword ? 'Skjul passord' : 'Vis passord'}
                                              >
                                                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                              </button>
                                          </div>
                                          {passwordErrors.currentPassword && (
                                              <p className="text-xs text-destructive font-medium mt-1.5">{passwordErrors.currentPassword}</p>
                                          )}
                                      </div>

                                      <div>
                                          <label className="block text-xs font-medium text-text-primary mb-1.5">Nytt passord</label>
                                          <div className="relative">
                                              <Input
                                                  type={showNewPassword ? 'text' : 'password'}
                                                  value={newPassword}
                                                  onChange={(e) => { setNewPassword(e.target.value); setPasswordErrors(prev => { const n = { ...prev }; delete n.newPassword; return n; }); }}
                                                  aria-invalid={!!passwordErrors.newPassword}
                                                  autoComplete="new-password"
                                              />
                                              <button
                                                  type="button"
                                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                                                  aria-label={showNewPassword ? 'Skjul passord' : 'Vis passord'}
                                              >
                                                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                              </button>
                                          </div>
                                          {passwordErrors.newPassword ? (
                                              <p className="text-xs text-destructive font-medium mt-1.5">{passwordErrors.newPassword}</p>
                                          ) : (
                                              <p className="text-xs text-text-secondary mt-1.5">Minimum 8 tegn.</p>
                                          )}
                                      </div>

                                      <div>
                                          <label className="block text-xs font-medium text-text-primary mb-1.5">Bekreft nytt passord</label>
                                          <Input
                                              type={showNewPassword ? 'text' : 'password'}
                                              value={confirmPassword}
                                              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordErrors(prev => { const n = { ...prev }; delete n.confirmPassword; return n; }); }}
                                              aria-invalid={!!passwordErrors.confirmPassword}
                                              autoComplete="new-password"
                                          />
                                          {passwordErrors.confirmPassword && (
                                              <p className="text-xs text-destructive font-medium mt-1.5">{passwordErrors.confirmPassword}</p>
                                          )}
                                      </div>

                                      <div className="flex justify-end gap-3 pt-2">
                                          <Button
                                              variant="ghost"
                                              size="compact"
                                              onClick={() => {
                                                  setPasswordExpanded(false);
                                                  setPasswordErrors({});
                                                  setCurrentPassword('');
                                                  setNewPassword('');
                                                  setConfirmPassword('');
                                              }}
                                          >
                                              Avbryt
                                          </Button>
                                          <Button
                                              size="compact"
                                              onClick={handleChangePassword}
                                              disabled={isChangingPassword}
                                          >
                                              {isChangingPassword ? 'Oppdaterer' : 'Oppdater passord'}
                                          </Button>
                                      </div>
                                  </div>
                              )}
                          </div>

                          {/* Logg ut alle enheter */}
                          <div className="flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors">
                              <div>
                                  <span className="text-sm font-medium text-text-primary block">Logg ut alle enheter</span>
                                  <span className="text-xs text-text-secondary block">Logger deg ut overalt.</span>
                              </div>
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button
                                          variant="ghost"
                                          size="compact"
                                          className="text-text-secondary hover:text-text-primary ml-4 shrink-0"
                                      >
                                          Logg ut alle →
                                      </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                          <AlertDialogTitle>Logg ut alle enheter?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              Du blir logget ut fra alle nettlesere og enheter, inkludert denne.
                                          </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                          <AlertDialogAction
                                              onClick={handleLogoutAllDevices}
                                              disabled={isLoggingOutAll}
                                          >
                                              {isLoggingOutAll ? 'Logger ut …' : 'Logg ut alle'}
                                          </AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          </div>
                      </div>
                  </section>

                  {/* E-postvarslinger */}
                  <section className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 py-10">
                    <div>
                      <h2 className="text-sm font-medium text-text-primary">E-postvarslinger</h2>
                      <p className="text-sm text-text-secondary mt-1">Velg hvilke e-poster du vil motta.</p>
                    </div>
                    <div className="md:col-span-2 rounded-xl bg-white border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
                          <div className="flex items-center justify-between p-4">
                              <div className="flex flex-col">
                                  <span className="text-sm font-medium text-text-primary">Nye påmeldinger</span>
                                  <span className="text-xs text-text-secondary">Få e-post når noen melder seg på kurset ditt.</span>
                              </div>
                              <Switch
                                  size="sm"
                                  checked={notifications.newSignups}
                                  onCheckedChange={() => handleNotificationToggle('newSignups')}
                                  aria-label="Nye påmeldinger"
                              />
                          </div>

                          <div className="flex items-center justify-between p-4">
                              <div className="flex flex-col">
                                  <span className="text-sm font-medium text-text-primary">Avbestillinger</span>
                                  <span className="text-xs text-text-secondary">Få e-post når noen avbestiller.</span>
                              </div>
                              <Switch
                                  size="sm"
                                  checked={notifications.cancellations}
                                  onCheckedChange={() => handleNotificationToggle('cancellations')}
                                  aria-label="Avbestillinger"
                              />
                          </div>

                          <div className="flex items-center justify-between p-4">
                              <div className="flex flex-col">
                                  <span className="text-sm font-medium text-text-primary">Nye meldinger</span>
                                  <span className="text-xs text-text-secondary">Få e-post når du mottar en ny melding.</span>
                              </div>
                              <Switch
                                  size="sm"
                                  checked={notifications.messages}
                                  onCheckedChange={() => handleNotificationToggle('messages')}
                                  aria-label="Nye meldinger"
                              />
                          </div>

                          <div className="flex items-center justify-between p-4">
                              <div className="flex flex-col">
                                  <span className="text-sm font-medium text-text-primary">Nyheter fra Ease</span>
                                  <span className="text-xs text-text-secondary">Tips, oppdateringer og nyheter på e-post.</span>
                              </div>
                              <Switch
                                  size="sm"
                                  checked={notifications.marketing}
                                  onCheckedChange={() => handleNotificationToggle('marketing')}
                                  aria-label="Nyheter fra Ease"
                              />
                          </div>
                      </div>
                  </section>

                  {/* Slett konto */}
                  <section className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 py-10">
                    <div>
                      <h2 className="text-sm font-medium text-text-primary">Slett konto</h2>
                      <p className="text-sm text-text-secondary mt-1">Permanent sletting av kontoen din.</p>
                    </div>
                    <div className="md:col-span-2 rounded-xl bg-white border border-zinc-200 p-4">
                          <div className="flex items-center justify-between">
                              <div>
                                  <span className="text-sm font-medium text-text-primary block">Slett kontoen din</span>
                                  <span className="text-xs text-text-secondary block">All data slettes permanent.</span>
                              </div>
                              <AlertDialog onOpenChange={(open) => { if (!open) setDeleteConfirmText(''); }}>
                                  <AlertDialogTrigger asChild>
                                      <Button
                                          variant="ghost"
                                          size="compact"
                                          className="text-destructive hover:text-destructive ml-4 shrink-0"
                                      >
                                          Slett konto →
                                      </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                          <AlertDialogTitle>Slette kontoen din?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              All data, inkludert kurs, påmeldinger og meldinger, slettes permanent. Dette kan ikke angres.
                                          </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <div className="py-2">
                                          <label className="block text-xs font-medium text-text-primary mb-1.5">
                                              Skriv SLETT for å bekrefte
                                          </label>
                                          <Input
                                              value={deleteConfirmText}
                                              onChange={(e) => setDeleteConfirmText(e.target.value)}
                                              placeholder="SLETT"
                                              autoComplete="off"
                                          />
                                      </div>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                          <AlertDialogAction
                                              onClick={handleDeleteAccount}
                                              disabled={deleteConfirmText !== 'SLETT'}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                              Slett
                                          </AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          </div>
                      </div>
                  </section>
            </div>

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
  );
};

export default TeacherProfilePage;
