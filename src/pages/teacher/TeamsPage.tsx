import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, X } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { DirtyFormBar } from '@/components/ui/dirty-form-bar';
import { FieldError } from '@/components/ui/field-error';
import { ImageField } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { PageShell } from '@/components/teacher/PageShell';
import { useAuth } from '@/contexts/AuthContext';
import { useLocations } from '@/hooks/use-locations';
import { friendlyError } from '@/lib/error-messages';
import { logger } from '@/lib/logger';
import { createLocation, updateLocation } from '@/services/locations';
import { updateSeller } from '@/services/sellers';
import { renameTeamSlug, updateTeam } from '@/services/teams';
import { uploadSellerLogo } from '@/services/storage';
import type { Seller, Team } from '@/types/database';

const DEFAULT_PLACE_NAME = 'Studio';

const TeamsPage = () => {
  const { currentTeam, currentSeller, refreshSellers } = useAuth();

  return (
    <main className="flex-1 min-h-full overflow-y-auto bg-background">
      <MobileTeacherHeader title="Studio" />

      <PageShell
        title="Studio"
        action={
          currentTeam?.slug ? (
            <Button
              onClick={() => window.open(`/${currentTeam.slug}`, '_blank')}
            >
              <ExternalLink className="size-4" />
              Se siden din
            </Button>
          ) : null
        }
      >
        {currentTeam && currentSeller ? (
          <StudioPublicSettings
            team={currentTeam}
            seller={currentSeller}
            onSaved={refreshSellers}
          />
        ) : (
          <p className="text-base text-foreground-muted">
            Vi fant ikke studioet ditt. Logg ut og inn igjen, eller kontakt brukerstøtte hvis problemet fortsetter.
          </p>
        )}
      </PageShell>
    </main>
  );
};

function StudioPublicSettings({
  team,
  seller,
  onSaved,
}: {
  team: Team;
  seller: Seller;
  onSaved: () => Promise<void> | void;
}) {
  const { locations, isLoading: loadingLocations, refetch } = useLocations(seller.id);
  const primaryLocation = locations[0] ?? null;
  const additionalLocations = locations.slice(1);

  const [savingPhoto, setSavingPhoto] = useState(false);
  const [logoUrl, setLogoUrl] = useState(seller.logo_url);
  useEffect(() => {
    setLogoUrl(seller.logo_url);
  }, [seller.logo_url]);

  const [name, setName] = useState(seller.name);
  const [nameError, setNameError] = useState<string | null>(null);
  useEffect(() => {
    setName(seller.name);
  }, [seller.name]);

  const [slug, setSlug] = useState(team.slug);
  const [slugError, setSlugError] = useState<string | null>(null);
  useEffect(() => {
    setSlug(team.slug);
  }, [team.slug]);

  const [placeName, setPlaceName] = useState(DEFAULT_PLACE_NAME);
  const [address, setAddress] = useState('');
  const [rooms, setRooms] = useState<string[]>([]);
  const [newRoom, setNewRoom] = useState('');
  const [placeError, setPlaceError] = useState<string | null>(null);

  useEffect(() => {
    setPlaceName(primaryLocation?.name ?? DEFAULT_PLACE_NAME);
    setAddress(primaryLocation?.address ?? '');
    setRooms(primaryLocation?.rooms ?? []);
    setNewRoom('');
    setPlaceError(null);
  }, [primaryLocation?.id, primaryLocation?.name, primaryLocation?.address, primaryLocation?.rooms]);

  const [isSaving, setIsSaving] = useState(false);

  const isDirty = useMemo(() => {
    const locationDirty = primaryLocation
      ? placeName.trim() !== primaryLocation.name ||
        address.trim() !== (primaryLocation.address ?? '') ||
        !sameStringArray(rooms, primaryLocation.rooms ?? [])
      : placeName.trim() !== DEFAULT_PLACE_NAME || address.trim() !== '' || rooms.length > 0;

    return name.trim() !== seller.name || slug.trim() !== team.slug || locationDirty;
  }, [address, name, placeName, primaryLocation, rooms, seller.name, slug, team.slug]);

  const handleCancel = () => {
    setName(seller.name);
    setSlug(team.slug);
    setNameError(null);
    setSlugError(null);
    setPlaceName(primaryLocation?.name ?? DEFAULT_PLACE_NAME);
    setAddress(primaryLocation?.address ?? '');
    setRooms(primaryLocation?.rooms ?? []);
    setNewRoom('');
    setPlaceError(null);
  };

  const addRoom = () => {
    const trimmed = newRoom.trim();
    if (!trimmed || rooms.includes(trimmed)) {
      setNewRoom('');
      return;
    }
    setRooms((prev) => [...prev, trimmed]);
    setNewRoom('');
  };

  const removeRoom = (room: string) => {
    setRooms((prev) => prev.filter((value) => value !== room));
  };

  const handleSave = async () => {
    if (isSaving) return;

    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();
    const trimmedPlaceName = placeName.trim();
    const trimmedAddress = address.trim();

    let blocked = false;
    if (!trimmedName) {
      setNameError('Skriv inn et navn.');
      blocked = true;
    } else {
      setNameError(null);
    }

    if (!trimmedSlug) {
      setSlugError('Skriv inn en nettadresse.');
      blocked = true;
    } else {
      setSlugError(null);
    }

    if ((trimmedAddress || rooms.length > 0) && !trimmedPlaceName) {
      setPlaceError('Skriv inn et navn på stedet.');
      blocked = true;
    } else {
      setPlaceError(null);
    }

    if (blocked) return;

    setIsSaving(true);
    try {
      if (trimmedName !== seller.name) {
        const { error } = await updateSeller(seller.id, { name: trimmedName });
        if (error) {
          setNameError(friendlyError(error, 'Kunne ikke lagre navnet.'));
          return;
        }
        void updateTeam(team.id, { name: trimmedName }).catch((err) => {
          logger.warn('Failed to mirror seller name onto team row:', err);
        });
        setName(trimmedName);
      }

      if (trimmedSlug !== team.slug) {
        const { slug: nextSlug, error } = await renameTeamSlug(team.id, trimmedSlug);
        if (error || !nextSlug) {
          const msg = error?.message ?? '';
          if (msg.includes('already taken')) setSlugError('Denne nettadressen er opptatt. Velg en annen.');
          else if (msg.includes('reserved')) setSlugError('Denne nettadressen er reservert. Velg en annen.');
          else if (msg.includes('at least 3')) setSlugError('Bruk minst 3 tegn.');
          else setSlugError(friendlyError(error, 'Kunne ikke endre nettadressen.'));
          return;
        }
        setSlug(nextSlug);
      }

      const shouldPersistLocation = !!primaryLocation || !!trimmedAddress || rooms.length > 0;
      if (shouldPersistLocation) {
        const payload = {
          name: trimmedPlaceName || DEFAULT_PLACE_NAME,
          address: trimmedAddress || null,
          rooms,
        };
        const result = primaryLocation
          ? await updateLocation(primaryLocation.id, payload)
          : await createLocation({ seller_id: seller.id, ...payload });

        if (result.error) {
          setPlaceError(friendlyError(result.error, 'Kunne ikke lagre sted og rom.'));
          return;
        }
        await refetch();
      }

      await onSaved();
      toast.success('Studioet er oppdatert.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoSelected = async (file: File | null) => {
    if (!file) return;

    setSavingPhoto(true);
    try {
      const { url, error: uploadError } = await uploadSellerLogo(seller.id, file);
      if (uploadError || !url) throw uploadError ?? new Error('Kunne ikke laste opp bildet.');

      const { error } = await updateSeller(seller.id, { logo_url: url });
      if (error) throw error;

      setLogoUrl(url);
      await onSaved();
    } catch (err) {
      const isLocalValidation =
        err instanceof Error &&
        (err.message.startsWith('Ugyldig filtype') || err.message.startsWith('Bildet er for stort'));
      toast.error(isLocalValidation ? err.message : friendlyError(err, 'Kunne ikke laste opp bildet.'));
    } finally {
      setSavingPhoto(false);
    }
  };

  const handlePhotoRemove = async () => {
    setSavingPhoto(true);
    const { error } = await updateSeller(seller.id, { logo_url: null });
    setSavingPhoto(false);
    if (error) {
      toast.error('Kunne ikke fjerne bildet.');
      return;
    }
    setLogoUrl(null);
    await onSaved();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="max-w-3xl space-y-10">
          <section>
            <div className="space-y-6">
              <div className="grid gap-3">
                <div>
                  <span className="text-base font-medium text-foreground">Profilbilde</span>
                  <p className="mt-1 text-base text-foreground-muted">
                    Bildet vises på den offentlige siden.
                  </p>
                </div>
                <ImageField
                  variant="avatar"
                  value={logoUrl}
                  onChange={handlePhotoSelected}
                  onRemove={handlePhotoRemove}
                  loading={savingPhoto}
                  ariaLabel="Last opp profilbilde"
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="studio-name" className="text-sm font-medium text-foreground">
                  Navn
                </label>
                <Input
                  id="studio-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isSaving}
                  aria-invalid={!!nameError || undefined}
                  aria-describedby={nameError ? 'studio-name-error' : undefined}
                />
                {nameError && <FieldError id="studio-name-error">{nameError}</FieldError>}
              </div>

              <div className="grid gap-2">
                <label htmlFor="studio-slug" className="text-sm font-medium text-foreground">
                  Nettadresse
                </label>
                <InputGroup data-disabled={isSaving || undefined}>
                  <InputGroupAddon align="inline-start">openspot.no/</InputGroupAddon>
                  <InputGroupInput
                    id="studio-slug"
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      if (slugError) setSlugError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={isSaving}
                    aria-invalid={!!slugError || undefined}
                    aria-describedby={slugError ? 'studio-slug-error' : undefined}
                  />
                </InputGroup>
                {slugError && <FieldError id="studio-slug-error">{slugError}</FieldError>}
              </div>
            </div>
          </section>

          <section className="border-t border-border pt-8">
            <SectionHeader
              title="Sted og rom"
              description="Brukes når du lager kurs og når deltakerne ser hvor de skal møte opp."
            />

            <div className="mt-6 space-y-6">
              <div className="grid gap-2">
                <label
                  htmlFor="studio-place-name"
                  data-error={!!placeError || undefined}
                  className="text-sm font-medium text-foreground data-[error=true]:text-danger"
                >
                  Stedsnavn
                </label>
                <Input
                  id="studio-place-name"
                  value={placeName}
                  onChange={(e) => {
                    setPlaceName(e.target.value);
                    if (placeError) setPlaceError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isSaving || loadingLocations}
                  aria-invalid={!!placeError || undefined}
                  aria-describedby={placeError ? 'studio-place-error' : undefined}
                />
                {placeError && <FieldError id="studio-place-error">{placeError}</FieldError>}
              </div>

              <div className="grid gap-2">
                <label htmlFor="studio-address" className="text-sm font-medium text-foreground">
                  Adresse
                </label>
                <Input
                  id="studio-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSaving || loadingLocations}
                  placeholder="Gateadresse, by"
                />
              </div>

              <div className="grid gap-3">
                <span className="text-base font-medium text-foreground">Rom</span>
                {rooms.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {rooms.map((room) => (
                      <span
                        key={room}
                        className="inline-flex h-8 items-center gap-1 rounded-full bg-muted pl-3 pr-1 text-base font-medium text-foreground"
                      >
                        {room}
                        <button
                          type="button"
                          onClick={() => removeRoom(room)}
                          className="flex size-6 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-active hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/15"
                          aria-label={`Fjern ${room}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addRoom();
                      }
                    }}
                    disabled={isSaving || loadingLocations}
                  placeholder="Sal 1, behandlingsrom, ute…"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={addRoom}
                    disabled={!newRoom.trim()}
                    className="sm:w-auto"
                  >
                    Legg til rom
                  </Button>
                </div>
              </div>

              {additionalLocations.length > 0 && (
                <div className="border-t border-border pt-6">
                  <p className="text-base font-medium text-foreground">Andre lagrede steder</p>
                  <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface">
                    {additionalLocations.map((location) => (
                      <div key={location.id} className="px-4 py-3">
                        <p className="truncate text-base font-medium text-foreground">{location.name}</p>
                        {location.address && (
                          <p className="truncate text-base text-foreground-muted">{location.address}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

      <DirtyFormBar
        visible={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-medium tracking-tight text-foreground">{title}</h2>
      <p className="mt-1 max-w-2xl text-base text-foreground-muted">{description}</p>
    </div>
  );
}

function sameStringArray(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

export default TeamsPage;
