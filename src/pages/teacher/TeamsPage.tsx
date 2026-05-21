import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { pageVariants, pageTransition } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { ImageField } from '@/components/ui/image-upload';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { LocationsSection } from '@/components/teacher/studio/LocationsSection';
import { AffiliationsSection } from '@/components/teacher/studio/AffiliationsSection';
import { useAuth } from '@/contexts/AuthContext';
import { updateSeller } from '@/services/sellers';
import { renameTeamSlug, updateTeam } from '@/services/teams';
import { uploadSellerLogo } from '@/services/storage';
import { friendlyError } from '@/lib/error-messages';
import { logger } from '@/lib/logger';
import type { Seller, Team } from '@/types/database';

// ---------------------------------------------------------------------------
// "Min studio" — the seller's public storefront page (their team) plus the
// supporting concerns: affiliations (other instructors syndicated here) and
// locations (where they teach). Each seller has exactly ONE team auto-created
// on signup. All editing is inline — no modals.
// ---------------------------------------------------------------------------

const TeamsPage = () => {
  const { currentTeam, currentSeller, refreshSellers } = useAuth();

  const publicUrl = currentTeam?.slug
    ? `${window.location.origin}/${currentTeam.slug}`
    : null;

  return (
    <main className="flex-1 min-h-full overflow-y-auto bg-background">
      <MobileTeacherHeader title="Studio" />

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        transition={pageTransition}
        className="mx-auto w-full max-w-7xl px-6 pb-24 md:pb-8 lg:px-8"
      >
        <div className="mb-12 pt-6 lg:pt-12 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-medium tracking-tight text-foreground">Studio</h1>
          {publicUrl && (
            <Button asChild size="sm" className="shrink-0">
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                Vis min side
              </a>
            </Button>
          )}
        </div>

        {currentTeam ? (
          <div className="space-y-6">
            {/* Studiosiden — inline-editable storefront. Leads the page so the
                user lands on their public-facing identity first. */}
            <Card>
              <CardHeader>
                <CardTitle>Studiosiden</CardTitle>
                <CardDescription>Slik ser kundene siden din.</CardDescription>
              </CardHeader>
              <CardContent>
                {currentSeller && (
                  <StudioSidenForm
                    team={currentTeam}
                    seller={currentSeller}
                    onSaved={refreshSellers}
                  />
                )}
              </CardContent>
            </Card>

            {/* Adresser — physical addresses, still customer-relevant. */}
            <LocationsSection />

            {/* Team — members of the studio (business) or studio you belong to (individual). */}
            <AffiliationsSection />
          </div>
        ) : (
          <p className="text-base text-foreground-muted">
            Fant ingen studio. Logg ut og inn igjen, eller kontakt
            brukerstøtte hvis problemet vedvarer.
          </p>
        )}
      </motion.div>
    </main>
  );
};

function StudioSidenForm({
  team,
  seller,
  onSaved,
}: {
  team: Team;
  seller: Seller;
  onSaved: () => Promise<void> | void;
}) {
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [logoUrl, setLogoUrl] = useState(seller.logo_url);
  useEffect(() => {
    setLogoUrl(seller.logo_url);
  }, [seller.logo_url]);

  // Local state for the editable identity fields. Inputs re-sync from props
  // whenever the parent refreshes after a successful save.
  const [name, setName] = useState(seller.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  useEffect(() => {
    setName(seller.name);
  }, [seller.name]);

  const [slug, setSlug] = useState(team.slug);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [savingSlug, setSavingSlug] = useState(false);
  useEffect(() => {
    setSlug(team.slug);
  }, [team.slug]);

  const isNameDirty = name !== seller.name;
  const isSlugDirty = slug !== team.slug;

  const handleNameCancel = () => {
    setName(seller.name);
    setNameError(null);
  };

  const handleSlugCancel = () => {
    setSlug(team.slug);
    setSlugError(null);
  };

  const handleNameSave = async () => {
    if (savingName) return;
    const trimmed = name.trim();
    if (trimmed === seller.name) {
      setName(seller.name);
      setNameError(null);
      return;
    }
    if (!trimmed) {
      setNameError('Skriv inn et navn.');
      return;
    }
    setNameError(null);
    setSavingName(true);

    try {
      const { error } = await updateSeller(seller.id, { name: trimmed });
      if (error) {
        setNameError(friendlyError(error, 'Kunne ikke lagre navnet.'));
        return;
      }
      // Keep teams.name aligned. Best-effort: the seller name is the source of
      // truth for public rendering; a transient team-row lag is harmless.
      void updateTeam(team.id, { name: trimmed }).catch((err) => {
        logger.warn('Failed to mirror seller name onto team row:', err);
      });
      setName(trimmed);
      await onSaved();
      toast.success('Navnet er oppdatert.');
    } finally {
      setSavingName(false);
    }
  };

  const handleSlugSave = async () => {
    if (savingSlug) return;
    const trimmed = slug.trim();
    if (trimmed === team.slug) {
      setSlug(team.slug);
      setSlugError(null);
      return;
    }
    if (!trimmed) {
      setSlugError('Skriv inn en adresse.');
      return;
    }
    setSlugError(null);
    setSavingSlug(true);

    try {
      const { slug: nextSlug, error } = await renameTeamSlug(team.id, trimmed);
      if (error || !nextSlug) {
        const msg = error?.message ?? '';
        if (msg.includes('already taken')) {
          setSlugError('Denne adressen er opptatt. Velg en annen.');
        } else if (msg.includes('reserved')) {
          setSlugError('Denne adressen er reservert. Velg en annen.');
        } else if (msg.includes('at least 3')) {
          setSlugError('Bruk minst 3 tegn.');
        } else {
          setSlugError(friendlyError(error, 'Kunne ikke endre adressen.'));
        }
        return;
      }
      setSlug(nextSlug);
      await onSaved();
      toast.success('Adressen er oppdatert. Den gamle lenken videresender automatisk.');
    } finally {
      setSavingSlug(false);
    }
  };

  const handlePhotoSelected = async (file: File | null) => {
    if (!file) return;

    setSavingPhoto(true);
    try {
      const { url, error: uploadError } = await uploadSellerLogo(seller.id, file);
      if (uploadError || !url) {
        throw uploadError ?? new Error('Kunne ikke laste opp bildet.');
      }
      const { error } = await updateSeller(seller.id, { logo_url: url });
      if (error) throw error;
      setLogoUrl(url);
      await onSaved();
    } catch (err) {
      // Local validation errors (file size / type) carry friendly Norwegian
      // copy already; storage-layer errors go through friendlyError to avoid
      // leaking raw Supabase strings.
      const isLocalValidation =
        err instanceof Error &&
        (err.message.startsWith('Ugyldig filtype') || err.message.startsWith('Bildet er for stort'));
      toast.error(isLocalValidation ? (err as Error).message : friendlyError(err, 'Kunne ikke laste opp bildet.'));
    } finally {
      setSavingPhoto(false);
    }
  };

  const handlePhotoRemove = async () => {
    setSavingPhoto(true);
    const { error } = await updateSeller(seller.id, { logo_url: null });
    setSavingPhoto(false);
    if (error) {
      toast.error('Kunne ikke fjerne bildet');
      return;
    }
    setLogoUrl(null);
    await onSaved();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <span className="text-base font-medium text-foreground">Profilbilde</span>
        <ImageField
          variant="avatar"
          value={logoUrl}
          onChange={handlePhotoSelected}
          onRemove={handlePhotoRemove}
          loading={savingPhoto}
          ariaLabel="Last opp profilbilde"
          description="Bildet vises på studiosiden."
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="studio-name" className="text-base font-medium text-foreground">
          Navn
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <Input
            id="studio-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleNameSave();
              }
              if (e.key === 'Escape') {
                handleNameCancel();
              }
            }}
            disabled={savingName}
            aria-invalid={!!nameError || undefined}
            aria-describedby={nameError ? 'studio-name-error' : undefined}
          />
          {isNameDirty && (
            <div className="flex shrink-0 justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleNameCancel}
                disabled={savingName}
              >
                Avbryt
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleNameSave}
                loading={savingName}
                loadingText="Lagrer"
              >
                Lagre
              </Button>
            </div>
          )}
        </div>
        {nameError && <FieldError id="studio-name-error">{nameError}</FieldError>}
      </div>

      <div className="grid gap-2">
        <label htmlFor="studio-slug" className="text-base font-medium text-foreground">
          URL
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <InputGroup data-disabled={savingSlug || undefined}>
            <InputGroupAddon align="inline-start">openspot.no/</InputGroupAddon>
            <InputGroupInput
              id="studio-slug"
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                if (slugError) setSlugError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSlugSave();
                }
                if (e.key === 'Escape') {
                  handleSlugCancel();
                }
              }}
              disabled={savingSlug}
              aria-invalid={!!slugError || undefined}
              aria-describedby={slugError ? 'studio-slug-error' : undefined}
            />
          </InputGroup>
          {isSlugDirty && (
            <div className="flex shrink-0 justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSlugCancel}
                disabled={savingSlug}
              >
                Avbryt
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSlugSave}
                loading={savingSlug}
                loadingText="Lagrer"
              >
                Lagre
              </Button>
            </div>
          )}
        </div>
        {slugError && <FieldError id="studio-slug-error">{slugError}</FieldError>}
      </div>
    </div>
  );
}

export default TeamsPage;
