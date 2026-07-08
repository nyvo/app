import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { DirtyFormBar } from '@/components/ui/dirty-form-bar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { UnsavedChangesDialog, useUnsavedChanges } from '@/components/ui/unsaved-changes';
import { PasswordRow } from '@/components/teacher/PasswordRow';
import { PageShell } from '@/components/teacher/PageShell';
import { SettingsRows, SettingsRow } from '@/components/teacher/SettingsRows';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { resolveDisplayName } from '@/lib/utils';
import { friendlyError } from '@/lib/error-messages';
import { extractEdgeError } from '@/lib/edge-errors';
import { toast } from 'sonner';

const TeacherProfilePage = () => {
  const { profile, refreshSellers } = useAuth();

  // State for form fields - initialized from auth context. E-post is the
  // auth identity and is shown read-only — changing it would have to go
  // through supabase.auth.updateUser's confirmation flow, which we don't
  // support yet.
  const [name, setName] = useState('');

  useEffect(() => {
    if (profile) {
      setName(resolveDisplayName(profile.name, profile.email));
    }
  }, [profile]);

  // Dirty state tracking
  const isDirty = useMemo(() => {
    if (!profile) return false;
    return name !== resolveDisplayName(profile.name, profile.email);
  }, [profile, name]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { blocker, bypass } = useUnsavedChanges(isDirty);

  const handleCancel = () => {
    if (profile) {
      setName(resolveDisplayName(profile.name, profile.email));
    }
    setSaveError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    // Save profile name. Empty input clears the column (NULL) — the trigger
    // seeds it from Google's display name on signup, but the user can wipe it.
    if (profile?.id) {
      const trimmed = name.trim();
      const { error: profileError } = await supabase.from('profiles')
        .update({ name: trimmed || null })
        .eq('id', profile.id);

      if (profileError) {
        setSaveError(friendlyError(profileError, 'Kunne ikke lagre endringene.'));
        setIsSaving(false);
        return;
      }

      // Match the local field to what was actually persisted so the baseline
      // (and thus isDirty) is correct even if refreshSellers doesn't refresh
      // the profile — an empty input falls back to the resolved display name.
      setName(trimmed || resolveDisplayName(null, profile.email));
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
    // Signing out redirects via the router — don't let a dirty name field
    // block it behind the unsaved-changes dialog.
    bypass();
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
      toast.error(message || 'Kunne ikke slette kontoen – prøv igjen');
      setIsDeletingAccount(false);
      return;
    }
    bypass();
    await supabase.auth.signOut();
    toast.success('Kontoen din er slettet');
  };

  return (
    <PageShell title="Innstillinger">
          <SettingsRows>
            <SettingsRow
              title="Personlig informasjon"
              description="Navn og kontaktinformasjon for kontoen din."
            >
              <div className="grid gap-2">
                <Label htmlFor="profile-name">Navn</Label>
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
                <Label htmlFor="profile-email">E-post</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  aria-describedby="profile-email-hint"
                />
                <p id="profile-email-hint" className="text-sm text-foreground-muted">
                  E-postadressen er knyttet til innloggingen din og kan ikke endres.
                </p>
              </div>
            </SettingsRow>

            <SettingsRow
              title="Konto og sikkerhet"
              description="Passord, pålogging og sletting av kontoen."
            >
              <div className="divide-y divide-border-subtle">
                <PasswordRow />
                <div className="flex items-center justify-between gap-4 py-5">
                  <span className="text-base font-medium text-foreground">Logg ut alle enheter</span>
                  <Button
                    variant="secondary"
                    className="shrink-0"
                    onClick={() => setLogoutAllOpen(true)}
                  >
                    Logg ut alle
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-4 py-5 last:pb-0">
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
            </SettingsRow>
          </SettingsRows>

          <DirtyFormBar
            visible={isDirty || !!saveError}
            error={saveError}
            isSaving={isSaving}
            onSave={handleSave}
            onCancel={handleCancel}
          />
          <UnsavedChangesDialog blocker={blocker} />
        </PageShell>
  );
};

export default TeacherProfilePage;
