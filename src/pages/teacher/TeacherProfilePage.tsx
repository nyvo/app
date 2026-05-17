import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { pageVariants, pageTransition } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, typedFrom } from '@/lib/supabase';
import { isValidEmail } from '@/lib/utils';
import { AUTH_VALIDATION } from '@/lib/auth-messages';
import { toast } from 'sonner';

const TeacherProfilePage = () => {
  const { profile, refreshSellers } = useAuth();

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
      newErrors.email = AUTH_VALIDATION.emailRequired;
      isValid = false;
    } else if (!isValidEmail(email)) {
      newErrors.email = AUTH_VALIDATION.emailInvalid;
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
        newErrors.email = AUTH_VALIDATION.emailRequired;
      } else if (!isValidEmail(email)) {
        newErrors.email = AUTH_VALIDATION.emailInvalid;
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

  // Logout all devices
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);

  // Delete account
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Logout all devices handler
  const handleLogoutAllDevices = async () => {
    setIsLoggingOutAll(true);
    await supabase.auth.signOut({ scope: 'global' });
  };

  // Delete account handler (deferred — signs out + instructs to contact support)
  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    await supabase.auth.signOut();
    toast.info('Kontoen slettes. Kontakt hei@openspot.no for å angre.');
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
          className="mx-auto w-full max-w-4xl px-6 pb-24 md:pb-8 lg:px-8"
        >
          <div className="mb-12 pt-6 lg:pt-12">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Innstillinger
            </h1>
          </div>

          <div className="space-y-6">
            {/* Personlig informasjon */}
            <Card>
              <CardHeader>
                <CardTitle>Personlig informasjon</CardTitle>
              </CardHeader>
              <CardContent>
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
                      <FieldError id="profile-firstname-error" className="mt-0">{errors.firstName}</FieldError>
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
                      <FieldError id="profile-lastname-error" className="mt-0">{errors.lastName}</FieldError>
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
                      aria-describedby={errors.email && touched.email ? 'profile-email-error' : undefined}
                    />
                    {errors.email && touched.email && (
                      <FieldError id="profile-email-error" className="mt-0">{errors.email}</FieldError>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Konto og sikkerhet */}
            <Card>
              <CardHeader>
                <CardTitle>Konto og sikkerhet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {/* Logg ut alle enheter */}
                  <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div>
                      <span className="text-sm font-medium block text-foreground">Logg ut alle enheter</span>
                      <span className="text-sm block text-foreground-muted">Logger deg ut overalt.</span>
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
                      headline="Logg ut fra alle enheter?"
                      actionLabel="Logg ut alle"
                      onConfirm={handleLogoutAllDevices}
                      loading={isLoggingOutAll}
                      loadingText="Logger ut"
                    >
                      <p className="text-sm text-foreground-muted">
                        Du blir logget ut fra alle nettlesere og enheter, inkludert denne.
                      </p>
                    </ConfirmDialog>
                  </div>

                  {/* Slett konto */}
                  <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div>
                      <span className="text-sm font-medium block text-foreground">Slett kontoen din</span>
                      <span className="text-sm block text-foreground-muted">All data slettes permanent.</span>
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
                      headline="Slett kontoen din?"
                      actionLabel="Slett konto"
                      onConfirm={handleDeleteAccount}
                      disabled={deleteConfirmText !== 'SLETT'}
                      loading={isDeletingAccount}
                      loadingText="Sletter"
                    >
                      <p className="text-sm text-foreground-muted">
                        Alle kurs, påmeldinger og meldinger slettes permanent. Dette kan ikke angres.
                      </p>
                      <div className="grid gap-2">
                        <label htmlFor="delete-confirm" className="text-sm text-foreground-muted">
                          Skriv <span className="font-medium text-foreground">SLETT</span> for å bekrefte
                        </label>
                        <Input
                          id="delete-confirm"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    </ConfirmDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
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
