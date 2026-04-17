import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Eye,
  EyeOff,
} from '@/lib/icons';
import { pageVariants, pageTransition } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import type { Json } from '@/types/database';
import { supabase, typedFrom } from '@/lib/supabase';
import { isValidEmail } from '@/lib/utils';
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

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
    } else if (!isValidEmail(email)) {
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
      } else if (!isValidEmail(email)) {
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

    await refreshOrganizations();

    toast.success('Endringer lagret');
    setIsSaving(false);
  };

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
    else if (newPassword.length < 10) errs.newPassword = 'Må være minst 10 tegn';
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
      settings: newSettings as unknown as Json,
    });

    if (error) {
      setNotifications(previous);
      toast.error('Kunne ikke lagre innstilling');
      return;
    }

    await refreshOrganizations();
  };

  return (
    <main className="flex-1 min-h-full overflow-y-auto bg-background">
        <MobileTeacherHeader title="Innstillinger" />

        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
          className="px-6 pb-24 md:pb-8 lg:px-8"
        >
          <div className="mb-10 border-b border-border pt-6 pb-8 lg:pt-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Innstillinger
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Din profil, varslinger og kontoinnstillinger.</p>
          </div>
          <div className="mx-auto max-w-5xl space-y-8">
                  {/* Personlig informasjon */}
                  <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                    <div>
                      <h2 className="text-base font-medium text-foreground">Personlig informasjon</h2>
                      <p className="text-sm mt-1 text-muted-foreground">Navn, e-post og informasjon om studioet ditt.</p>
                    </div>
                    <Card className="md:col-span-2">
                      <CardContent className="md:px-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="profile-firstname" className="text-xs font-medium mb-1.5 block text-foreground">Fornavn</label>
                            <Input
                                id="profile-firstname"
                                type="text"
                                value={firstName}
                                onChange={(e) => { setFirstName(e.target.value); clearError('firstName'); }}
                                onBlur={() => handleBlur('firstName')}
                                aria-invalid={!!errors.firstName}
                            />
                            {errors.firstName && touched.firstName && (
                              <p className="text-xs font-medium tracking-wide mt-1.5 text-destructive">{errors.firstName}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="profile-lastname" className="text-xs font-medium mb-1.5 block text-foreground">Etternavn</label>
                            <Input
                                id="profile-lastname"
                                type="text"
                                value={lastName}
                                onChange={(e) => { setLastName(e.target.value); clearError('lastName'); }}
                                onBlur={() => handleBlur('lastName')}
                                aria-invalid={!!errors.lastName}
                            />
                            {errors.lastName && touched.lastName && (
                              <p className="text-xs font-medium tracking-wide mt-1.5 text-destructive">{errors.lastName}</p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="profile-email" className="text-xs font-medium mb-1.5 block text-foreground">E-post</label>
                            <Input
                                id="profile-email"
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                                onBlur={() => handleBlur('email')}
                                aria-invalid={!!errors.email}
                            />
                            {errors.email && touched.email ? (
                              <p className="text-xs font-medium tracking-wide mt-1.5 text-destructive">{errors.email}</p>
                            ) : (
                              <p className="text-xs font-medium tracking-wide mt-1.5 text-muted-foreground">Vi sender deg en bekreftelse hvis du endrer e-posten.</p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="profile-city" className="text-xs font-medium mb-1.5 block text-foreground">By / Sted</label>
                            <Input
                                id="profile-city"
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="Oslo"
                            />
                            <p className="text-xs font-medium tracking-wide mt-1.5 text-muted-foreground">Vises på din offentlige side.</p>
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="profile-description" className="text-xs font-medium mb-1.5 block text-foreground">Om deg</label>
                            <Textarea
                                id="profile-description"
                                rows={4}
                                value={studioDescription}
                                onChange={(e) => { setStudioDescription(e.target.value); clearError('studioDescription'); }}
                                onBlur={() => handleBlur('studioDescription')}
                                placeholder="Fortell litt om deg"
                                aria-invalid={!!errors.studioDescription}
                            />
                            <div className="text-xs font-medium tracking-wide mt-1.5 flex justify-between">
                                {errors.studioDescription && touched.studioDescription ? (
                                  <span className="text-destructive">{errors.studioDescription}</span>
                                ) : (
                                  <span className="text-muted-foreground">Vises på din offentlige side.</span>
                                )}
                                <span className={studioDescription.length > 500 ? 'text-destructive' : 'text-muted-foreground'}>{studioDescription.length}/500</span>
                            </div>
                        </div>
                      </div>
                      </CardContent>
                    </Card>
                  </section>

                  {/* Konto & Sikkerhet */}
                  <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                    <div>
                      <h2 className="text-base font-medium text-foreground">Konto & Sikkerhet</h2>
                      <p className="text-sm mt-1 text-muted-foreground">Passord og sikkerhet.</p>
                    </div>
                    <Card className="md:col-span-2 gap-0 divide-y divide-border py-0">
                          {/* Endre passord */}
                          <div className="px-6 py-4">
                              <div className="flex items-center justify-between">
                                  <div>
                                      <span className="text-sm font-medium block text-foreground">Endre passord</span>
                                      <span className="text-xs font-medium tracking-wide block text-muted-foreground">Oppdater passordet ditt.</span>
                                  </div>
                                  <Button
                                      variant={passwordExpanded ? 'ghost' : 'outline-soft'}
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
                                      className="ml-4 shrink-0"
                                  >
                                      {passwordExpanded ? 'Avbryt' : 'Endre'}
                                  </Button>
                              </div>

                              {/* Expanded password form */}
                              {passwordExpanded && (
                                  <div className="mt-4 space-y-4 rounded-lg bg-muted p-6 animate-in fade-in slide-in-from-top-1 duration-200 ease-out">
                                      <div>
                                          <label htmlFor="current-password" className="text-xs font-medium mb-1.5 block text-foreground">Nåværende passord</label>
                                          <div className="relative">
                                              <Input
                                                  id="current-password"
                                                  type={showCurrentPassword ? 'text' : 'password'}
                                                  value={currentPassword}
                                                  onChange={(e) => { setCurrentPassword(e.target.value); setPasswordErrors(prev => { const n = { ...prev }; delete n.currentPassword; return n; }); }}
                                                  aria-invalid={!!passwordErrors.currentPassword}
                                                  autoComplete="current-password"
                                              />
                                              <button
                                                  type="button"
                                                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-[color] duration-150 ease-out"
                                                  aria-label={showCurrentPassword ? 'Skjul passord' : 'Vis passord'}
                                              >
                                                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                              </button>
                                          </div>
                                          {passwordErrors.currentPassword && (
                                              <p className="text-xs font-medium tracking-wide mt-1.5 text-destructive">{passwordErrors.currentPassword}</p>
                                          )}
                                      </div>

                                      <div>
                                          <label htmlFor="new-password" className="text-xs font-medium mb-1.5 block text-foreground">Nytt passord</label>
                                          <div className="relative">
                                              <Input
                                                  id="new-password"
                                                  type={showNewPassword ? 'text' : 'password'}
                                                  value={newPassword}
                                                  onChange={(e) => { setNewPassword(e.target.value); setPasswordErrors(prev => { const n = { ...prev }; delete n.newPassword; return n; }); }}
                                                  aria-invalid={!!passwordErrors.newPassword}
                                                  autoComplete="new-password"
                                              />
                                              <button
                                                  type="button"
                                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-[color] duration-150 ease-out"
                                                  aria-label={showNewPassword ? 'Skjul passord' : 'Vis passord'}
                                              >
                                                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                              </button>
                                          </div>
                                          {passwordErrors.newPassword ? (
                                              <p className="text-xs font-medium tracking-wide mt-1.5 text-destructive">{passwordErrors.newPassword}</p>
                                          ) : (
                                              <p className="text-xs font-medium tracking-wide mt-1.5 text-muted-foreground">Må være minst 10 tegn</p>
                                          )}
                                      </div>

                                      <div>
                                          <label htmlFor="confirm-password" className="text-xs font-medium mb-1.5 block text-foreground">Bekreft nytt passord</label>
                                          <Input
                                              id="confirm-password"
                                              type={showNewPassword ? 'text' : 'password'}
                                              value={confirmPassword}
                                              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordErrors(prev => { const n = { ...prev }; delete n.confirmPassword; return n; }); }}
                                              aria-invalid={!!passwordErrors.confirmPassword}
                                              autoComplete="new-password"
                                          />
                                          {passwordErrors.confirmPassword && (
                                              <p className="text-xs font-medium tracking-wide mt-1.5 text-destructive">{passwordErrors.confirmPassword}</p>
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
                          <div className="flex items-center justify-between px-6 py-4">
                              <div>
                                  <span className="text-sm font-medium block text-foreground">Logg ut alle enheter</span>
                                  <span className="text-xs font-medium tracking-wide block text-muted-foreground">Logger deg ut overalt.</span>
                              </div>
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button
                                          variant="outline-soft"
                                          size="compact"
                                          className="ml-4 shrink-0"
                                      >
                                          Logg ut alle
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
                      </Card>
                  </section>

                  {/* E-postvarslinger */}
                  <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                    <div>
                      <h2 className="text-base font-medium text-foreground">E-postvarslinger</h2>
                      <p className="text-sm mt-1 text-muted-foreground">Velg hvilke e-poster du vil motta.</p>
                    </div>
                    <Card className="md:col-span-2 gap-0 divide-y divide-border py-0">
                          <div className="flex items-center justify-between px-6 py-4">
                              <div>
                                  <span className="text-sm font-medium block text-foreground">Nye påmeldinger</span>
                                  <span className="text-xs font-medium tracking-wide block text-muted-foreground">Få e-post når noen melder seg på kurset ditt.</span>
                              </div>
                              <Switch
                                  size="sm"
                                  checked={notifications.newSignups}
                                  onCheckedChange={() => handleNotificationToggle('newSignups')}
                                  aria-label="Nye påmeldinger"
                              />
                          </div>

                          <div className="flex items-center justify-between px-6 py-4">
                              <div>
                                  <span className="text-sm font-medium block text-foreground">Avbestillinger</span>
                                  <span className="text-xs font-medium tracking-wide block text-muted-foreground">Få e-post når noen avbestiller.</span>
                              </div>
                              <Switch
                                  size="sm"
                                  checked={notifications.cancellations}
                                  onCheckedChange={() => handleNotificationToggle('cancellations')}
                                  aria-label="Avbestillinger"
                              />
                          </div>

                          <div className="flex items-center justify-between px-6 py-4">
                              <div>
                                  <span className="text-sm font-medium block text-foreground">Nye meldinger</span>
                                  <span className="text-xs font-medium tracking-wide block text-muted-foreground">Få e-post når du mottar en ny melding.</span>
                              </div>
                              <Switch
                                  size="sm"
                                  checked={notifications.messages}
                                  onCheckedChange={() => handleNotificationToggle('messages')}
                                  aria-label="Nye meldinger"
                              />
                          </div>
                      </Card>
                  </section>

                  {/* Slett konto */}
                  <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                    <div>
                      <h2 className="text-base font-medium text-foreground">Slett konto</h2>
                      <p className="text-sm mt-1 text-muted-foreground">Permanent sletting av kontoen din.</p>
                    </div>
                    <Card className="md:col-span-2 gap-0 py-0">
                          <div className="flex items-center justify-between px-6 py-4">
                              <div>
                                  <span className="text-sm font-medium block text-foreground">Slett kontoen din</span>
                                  <span className="text-xs font-medium tracking-wide block text-muted-foreground">All data slettes permanent.</span>
                              </div>
                              <AlertDialog onOpenChange={(open) => { if (!open) setDeleteConfirmText(''); }}>
                                  <AlertDialogTrigger asChild>
                                      <Button
                                          variant="destructive-outline"
                                          size="compact"
                                          className="ml-4 shrink-0"
                                      >
                                          Slett konto
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
                                          <label className="text-xs font-medium mb-1.5 block text-foreground">
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
                      </Card>
                  </section>
          </div>

            {/* Global Footer Save (Sticky on Mobile, Static on Desktop) */}
            {isDirty && (
              <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-end gap-3 border-t border-border bg-background/80 p-4 backdrop-blur-md md:static md:mt-8 md:border-none md:bg-transparent md:p-0 md:backdrop-blur-none">
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
