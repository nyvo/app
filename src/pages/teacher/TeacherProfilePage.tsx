import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DirtyFormBar } from '@/components/ui/dirty-form-bar';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { PageShell } from '@/components/teacher/PageShell';
import { SettingsSection } from '@/components/teacher/SettingsSection';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, typedFrom } from '@/lib/supabase';
import { isValidEmail, resolveDisplayName } from '@/lib/utils';
import { AUTH_VALIDATION } from '@/lib/auth-messages';
import { extractEdgeError } from '@/lib/edge-errors';
import { toast } from 'sonner';

const TeacherProfilePage = () => {
  const { profile, refreshSellers } = useAuth();

  // State for form fields - initialized from auth context
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (profile) {
      setName(resolveDisplayName(profile.name, profile.email));
      setEmail(profile.email || '');
    }
  }, [profile]);

  // Dirty state tracking
  const isDirty = useMemo(() => {
    if (!profile) return false;
    const origName = resolveDisplayName(profile.name, profile.email);
    const origEmail = profile.email || '';
    return name !== origName || email !== origEmail;
  }, [profile, name, email]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

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
      setName(resolveDisplayName(profile.name, profile.email));
      setEmail(profile.email || '');
    }
    setErrors({});
    setTouched({});
  };

  const handleSave = async () => {
    setTouched({ name: true, email: true });

    if (!validateForm()) {
      const firstErrorField = document.querySelector('[aria-invalid="true"]') as HTMLElement;
      if (firstErrorField) {
        firstErrorField.focus();
      }
      return;
    }

    setIsSaving(true);

    // Save profile name. Empty input clears the column (NULL) — the trigger
    // seeds it from Google's display name on signup, but the user can wipe it.
    if (profile?.id) {
      const trimmed = name.trim();
      const { error: profileError } = await typedFrom('profiles')
        .update({ name: trimmed || null })
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

  // Delete account handler — deletes the caller's login + profile via the
  // delete-account edge function. It refuses (with a specific reason surfaced
  // via extractEdgeError) when the account still owns a studio, is an active
  // instructor, or owns uploaded files; otherwise the account is deleted and the
  // session cleared. Paid bookings/payments are retained, anonymized of the link.
  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) {
      const { message } = await extractEdgeError(error);
      toast.error(message || 'Kunne ikke slette kontoen. Prøv igjen.');
      setIsDeletingAccount(false);
      return;
    }
    await supabase.auth.signOut();
    toast.success('Kontoen din er slettet');
  };

  return (
    <main className="flex-1 min-h-full overflow-y-auto bg-background">
        <MobileTeacherHeader title="Innstillinger" />

        <PageShell narrow="centered" title="Innstillinger">
          <div className="space-y-10">
            <SettingsSection title="Personlig informasjon">
              <Card>
                <CardContent className="grid grid-cols-1 gap-6">
                  <div className="grid gap-2">
                    <label
                      htmlFor="profile-name"
                      className="text-sm font-medium text-foreground"
                    >
                      Navn
                    </label>
                    <Input
                      id="profile-name"
                      type="text"
                      value={name}
                      placeholder="Navnet ditt"
                      onChange={(e) => setName(e.target.value)}
                      aria-describedby="profile-name-hint"
                    />
                    <p id="profile-name-hint" className="text-sm text-foreground-muted">
                      Brukes bare på kontoen din. Den offentlige siden viser studionavnet.
                    </p>
                  </div>

                  <div className="grid gap-2">
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
                </CardContent>
              </Card>
            </SettingsSection>

            <SettingsSection title="Konto og sikkerhet">
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                <div className="flex items-center justify-between gap-4 px-5 py-4">
                  <span className="text-base font-medium text-foreground">Logg ut alle enheter</span>
                  <Button
                    variant="secondary"
                    className="shrink-0"
                    onClick={() => setLogoutAllOpen(true)}
                  >
                    Logg ut alle
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-4">
                  <span className="text-base font-medium text-foreground">Slett kontoen din</span>
                  <Button
                    variant="destructive"
                    className="shrink-0"
                    onClick={() => setDeleteOpen(true)}
                  >
                    Slett konto
                  </Button>
                </div>
              </div>

              <ConfirmDialog
                open={logoutAllOpen}
                onOpenChange={setLogoutAllOpen}
                ariaLabel="Logg ut alle enheter"
                title="Logg ut alle enheter"
                body="Du blir logget ut fra alle nettlesere og enheter, inkludert denne."
                actionLabel="Logg ut alle"
                onConfirm={handleLogoutAllDevices}
                loading={isLoggingOutAll}
                loadingText="Logger ut"
              />
              <ConfirmDialog
                open={deleteOpen}
                onOpenChange={(open) => {
                  setDeleteOpen(open);
                  if (!open) setDeleteConfirmText('');
                }}
                ariaLabel="Slett kontoen din"
                title="Slett konto"
                body={<>Kontoen <strong>{profile?.email}</strong> slettes permanent. Dette kan ikke angres.</>}
                actionLabel="Slett konto"
                destructive
                onConfirm={handleDeleteAccount}
                loading={isDeletingAccount}
                loadingText="Sletter"
                typeToConfirm="SLETT"
                typeToConfirmValue={deleteConfirmText}
                onTypeToConfirmChange={setDeleteConfirmText}
              />
            </SettingsSection>

            <DirtyFormBar
              visible={isDirty}
              isSaving={isSaving}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        </PageShell>
    </main>
  );
};

export default TeacherProfilePage;
