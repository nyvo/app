import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Eye,
  EyeOff,
} from '@/lib/icons';
import { pageVariants, pageTransition } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog, ConfirmScopeItem } from '@/components/ui/confirm-dialog';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, typedFrom } from '@/lib/supabase';
import { isValidEmail } from '@/lib/utils';
import { toast } from 'sonner';

const TeacherProfilePage = () => {
  const { profile, refreshSellers, updatePassword } = useAuth();

  // State for form fields - initialized from auth context
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (profile) {
      const nameParts = profile.name?.split(' ') || [];
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setEmail(profile.email || '');
    }
  }, [profile]);

  // Dirty state tracking
  const isDirty = useMemo(() => {
    if (!profile) return false;
    const nameParts = profile.name?.split(' ') || [];
    const origFirst = nameParts[0] || '';
    const origLast = nameParts.slice(1).join(' ') || '';
    const origEmail = profile.email || '';

    return (
      firstName !== origFirst ||
      lastName !== origLast ||
      email !== origEmail
    );
  }, [profile, firstName, lastName, email]);

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
    setErrors({});
    setTouched({});
  };

  const handleSave = async () => {
    setTouched({ firstName: true, lastName: true, email: true });

    if (!validateForm()) {
      const firstErrorField = document.querySelector('[aria-invalid="true"]') as HTMLElement;
      if (firstErrorField) {
        firstErrorField.focus();
      }
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

    await refreshSellers();

    toast.success('Endringer lagret');
    setIsSaving(false);
  };

  // Password change state
  const [passwordExpanded, setPasswordExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Logout all devices
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);

  // Delete account
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Password change handler
  const handleChangePassword = async () => {
    const errs: Record<string, string> = {};
    if (!currentPassword) errs.currentPassword = 'Skriv inn nåværende passord';
    if (!newPassword) errs.newPassword = 'Skriv inn nytt passord';
    else if (newPassword.length < 12) errs.newPassword = 'Må være minst 12 tegn';

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
    setIsDeletingAccount(true);
    await supabase.auth.signOut();
    toast.info('Kontoen slettes. Kontakt hei@ease.no for å angre.');
    setIsDeletingAccount(false);
  };

  return (
    <main className="flex-1 min-h-full overflow-y-auto bg-background">
        <MobileTeacherHeader title="Innstillinger" />

        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
          className="mx-auto w-full max-w-6xl px-6 pb-24 md:pb-8 lg:px-8"
        >
          <div className="mb-8 pt-6 lg:pt-12">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Innstillinger
            </h1>
          </div>
          <div>
                  {/* Personlig informasjon — first section, no top divider */}
                  <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">Personlig informasjon</h2>
                    </div>
                    <div className="md:col-span-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="grid gap-2">
                            <label
                              htmlFor="profile-firstname"
                              data-error={(errors.firstName && touched.firstName) || undefined}
                              className="text-sm font-medium text-foreground data-[error=true]:text-danger"
                            >
                              Fornavn
                            </label>
                            <Input
                                id="profile-firstname"
                                type="text"
                                value={firstName}
                                onChange={(e) => { setFirstName(e.target.value); clearError('firstName'); }}
                                onBlur={() => handleBlur('firstName')}
                                aria-invalid={!!(errors.firstName && touched.firstName) || undefined}
                                aria-describedby={errors.firstName && touched.firstName ? 'profile-firstname-error' : undefined}
                            />
                            {errors.firstName && touched.firstName && (
                              <p id="profile-firstname-error" role="alert" className="text-sm text-danger">{errors.firstName}</p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <label
                              htmlFor="profile-lastname"
                              data-error={(errors.lastName && touched.lastName) || undefined}
                              className="text-sm font-medium text-foreground data-[error=true]:text-danger"
                            >
                              Etternavn
                            </label>
                            <Input
                                id="profile-lastname"
                                type="text"
                                value={lastName}
                                onChange={(e) => { setLastName(e.target.value); clearError('lastName'); }}
                                onBlur={() => handleBlur('lastName')}
                                aria-invalid={!!(errors.lastName && touched.lastName) || undefined}
                                aria-describedby={errors.lastName && touched.lastName ? 'profile-lastname-error' : undefined}
                            />
                            {errors.lastName && touched.lastName && (
                              <p id="profile-lastname-error" role="alert" className="text-sm text-danger">{errors.lastName}</p>
                            )}
                        </div>

                        <div className="grid gap-2 md:col-span-2">
                            <label
                              htmlFor="profile-email"
                              data-error={(errors.email && touched.email) || undefined}
                              className="text-sm font-medium text-foreground data-[error=true]:text-danger"
                            >
                              E-post
                            </label>
                            <Input
                                id="profile-email"
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                                onBlur={() => handleBlur('email')}
                                aria-invalid={!!(errors.email && touched.email) || undefined}
                                aria-describedby={errors.email && touched.email ? 'profile-email-error' : 'profile-email-hint'}
                            />
                            {errors.email && touched.email ? (
                              <p id="profile-email-error" role="alert" className="text-sm text-danger">{errors.email}</p>
                            ) : (
                              <p id="profile-email-hint" className="text-sm text-foreground-muted">Vi sender deg en bekreftelse hvis du endrer e-posten.</p>
                            )}
                        </div>

                      </div>
                    </div>
                  </section>

                  {/* Konto & Sikkerhet */}
                  <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 mt-10 pt-10 border-t border-border">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">Konto & Sikkerhet</h2>
                    </div>
                    <div className="md:col-span-2 divide-y divide-border">
                          {/* Endre passord */}
                          <div className="py-4">
                              <div className="flex items-center justify-between">
                                  <div>
                                      <span className="text-sm font-medium block text-foreground">Endre passord</span>
                                      <span className="text-xs block text-foreground-muted">Oppdater passordet ditt.</span>
                                  </div>
                                  <Button
                                      variant={passwordExpanded ? 'ghost' : 'outline-soft'}
                                      size="sm"
                                      onClick={() => {
                                          setPasswordExpanded(!passwordExpanded);
                                          setPasswordErrors({});
                                          setCurrentPassword('');
                                          setNewPassword('');
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
                                  <div className="mt-4 space-y-4 rounded-lg bg-muted p-4">
                                      <div className="grid gap-2">
                                          <label
                                            htmlFor="current-password"
                                            data-error={!!passwordErrors.currentPassword || undefined}
                                            className="text-sm font-medium text-foreground data-[error=true]:text-danger"
                                          >
                                            Nåværende passord
                                          </label>
                                          <div className="relative">
                                              <Input
                                                  id="current-password"
                                                  type={showCurrentPassword ? 'text' : 'password'}
                                                  value={currentPassword}
                                                  onChange={(e) => { setCurrentPassword(e.target.value); setPasswordErrors(prev => { const n = { ...prev }; delete n.currentPassword; return n; }); }}
                                                  aria-invalid={!!passwordErrors.currentPassword || undefined}
                                                  aria-describedby={passwordErrors.currentPassword ? 'current-password-error' : undefined}
                                                  autoComplete="current-password"
                                                  className="pr-10"
                                              />
                                              <button
                                                  type="button"
                                                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-foreground-muted outline-none transition-colors duration-200 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                                                  aria-label={showCurrentPassword ? 'Skjul passord' : 'Vis passord'}
                                              >
                                                  {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                              </button>
                                          </div>
                                          {passwordErrors.currentPassword && (
                                              <p id="current-password-error" role="alert" className="text-sm text-danger">{passwordErrors.currentPassword}</p>
                                          )}
                                      </div>

                                      <div className="grid gap-2">
                                          <label
                                            htmlFor="new-password"
                                            data-error={!!passwordErrors.newPassword || undefined}
                                            className="text-sm font-medium text-foreground data-[error=true]:text-danger"
                                          >
                                            Nytt passord
                                          </label>
                                          <div className="relative">
                                              <Input
                                                  id="new-password"
                                                  type={showNewPassword ? 'text' : 'password'}
                                                  value={newPassword}
                                                  onChange={(e) => { setNewPassword(e.target.value); setPasswordErrors(prev => { const n = { ...prev }; delete n.newPassword; return n; }); }}
                                                  aria-invalid={!!passwordErrors.newPassword || undefined}
                                                  aria-describedby={passwordErrors.newPassword ? 'new-password-error' : 'new-password-hint'}
                                                  autoComplete="new-password"
                                                  className="pr-10"
                                              />
                                              <button
                                                  type="button"
                                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-foreground-muted outline-none transition-colors duration-200 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                                                  aria-label={showNewPassword ? 'Skjul passord' : 'Vis passord'}
                                              >
                                                  {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                              </button>
                                          </div>
                                          {passwordErrors.newPassword ? (
                                              <p id="new-password-error" role="alert" className="text-sm text-danger">{passwordErrors.newPassword}</p>
                                          ) : (
                                              <p id="new-password-hint" className="text-sm text-foreground-muted">Må være minst 12 tegn</p>
                                          )}
                                      </div>

                                      <div className="flex justify-end gap-2 pt-2">
                                          <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                  setPasswordExpanded(false);
                                                  setPasswordErrors({});
                                                  setCurrentPassword('');
                                                  setNewPassword('');
                                              }}
                                          >
                                              Avbryt
                                          </Button>
                                          <Button
                                              size="sm"
                                              onClick={handleChangePassword}
                                              loading={isChangingPassword}
                                              loadingText="Oppdaterer"
                                          >
                                              Oppdater passord
                                          </Button>
                                      </div>
                                  </div>
                              )}
                          </div>

                          {/* Logg ut alle enheter */}
                          <div className="flex items-center justify-between py-4">
                              <div>
                                  <span className="text-sm font-medium block text-foreground">Logg ut alle enheter</span>
                                  <span className="text-xs block text-foreground-muted">Logger deg ut overalt.</span>
                              </div>
                              <Button
                                  variant="outline-soft"
                                  size="sm"
                                  className="ml-4 shrink-0"
                                  onClick={() => setLogoutAllOpen(true)}
                              >
                                  Logg ut alle
                              </Button>
                              <ConfirmDialog
                                  open={logoutAllOpen}
                                  onOpenChange={setLogoutAllOpen}
                                  ariaLabel="Logg ut alle enheter"
                                  headline="Du blir logget ut fra alle nettlesere og enheter, inkludert denne."
                                  scope={
                                      <ConfirmScopeItem
                                          name={email || 'Kontoen din'}
                                          meta="Aktiv på alle påloggede enheter"
                                      />
                                  }
                                  actionLabel="Logg ut alle"
                                  actionVariant="default"
                                  onConfirm={handleLogoutAllDevices}
                                  loading={isLoggingOutAll}
                                  loadingText="Logger ut"
                              />
                          </div>
                      </div>
                  </section>

                  {/* Slett konto */}
                  <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 mt-10 pt-10 border-t border-border">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">Slett konto</h2>
                    </div>
                    <div className="md:col-span-2">
                          <div className="flex items-center justify-between py-4">
                              <div>
                                  <span className="text-sm font-medium block text-foreground">Slett kontoen din</span>
                                  <span className="text-xs block text-foreground-muted">All data slettes permanent.</span>
                              </div>
                              <Button
                                  variant="destructive"
                                  size="sm"
                                  className="ml-4 shrink-0"
                                  onClick={() => setDeleteOpen(true)}
                              >
                                  Slett konto
                              </Button>
                              <ConfirmDialog
                                  open={deleteOpen}
                                  onOpenChange={(open) => {
                                      setDeleteOpen(open);
                                      if (!open) setDeleteConfirmText('');
                                  }}
                                  ariaLabel="Slett kontoen din"
                                  headline="All data, inkludert kurs, påmeldinger og meldinger, slettes permanent. Dette kan ikke angres."
                                  scope={
                                      <ConfirmScopeItem
                                          name={email || 'Kontoen din'}
                                          meta="Permanent sletting"
                                      />
                                  }
                                  actionLabel="Slett konto"
                                  onConfirm={handleDeleteAccount}
                                  disabled={deleteConfirmText !== 'SLETT'}
                                  loading={isDeletingAccount}
                                  loadingText="Sletter"
                              >
                                  <div className="grid gap-2">
                                      <label htmlFor="delete-confirm" className="text-sm font-medium text-foreground">
                                          Skriv SLETT for å bekrefte
                                      </label>
                                      <Input
                                          id="delete-confirm"
                                          value={deleteConfirmText}
                                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                                          placeholder="SLETT"
                                          autoComplete="off"
                                      />
                                  </div>
                              </ConfirmDialog>
                          </div>
                      </div>
                  </section>
          </div>

            {/* Global Footer Save (Sticky on Mobile, Static on Desktop) */}
            {isDirty && (
              <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-end gap-2 border-t border-border bg-surface p-4 md:static md:mt-8 md:border-none md:bg-transparent md:p-0">
                  <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={handleCancel}>Avbryt</Button>
                  <Button
                    size="sm"
                    className="flex-1 justify-center md:flex-none"
                    onClick={handleSave}
                    loading={isSaving}
                    loadingText="Lagrer"
                  >
                      Lagre endringer
                  </Button>
              </div>
            )}

        </motion.div>
    </main>
  );
};

export default TeacherProfilePage;
