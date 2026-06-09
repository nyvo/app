import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, ExternalLink, Plus, X } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DirtyFormBar } from '@/components/ui/dirty-form-bar';
import { FieldError } from '@/components/ui/field-error';
import { ImageField } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { PlacesAutocomplete } from '@/components/ui/places-autocomplete';
import { MapEmbed } from '@/components/ui/map-embed';
import type { PlaceDetails } from '@/services/places';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { PageShell } from '@/components/teacher/PageShell';
import { SettingsSection } from '@/components/teacher/SettingsSection';
import { useAuth } from '@/contexts/AuthContext';
import { useLocations } from '@/hooks/use-locations';
import { friendlyError } from '@/lib/error-messages';
import { logger } from '@/lib/logger';
import { createLocation, updateLocation } from '@/services/locations';
import { parseRooms, type Room } from '@/lib/rooms';
import { runWithUndo } from '@/lib/undo';
import { updateSeller } from '@/services/sellers';
import { renameTeamSlug, updateTeam } from '@/services/teams';
import { deleteSellerLogo, uploadSellerLogo } from '@/services/storage';
import type { Seller, Team } from '@/types/database';

const StudioPage = () => {
  const { currentTeam, currentSeller, refreshSellers } = useAuth();

  return (
    <main className="flex-1 min-h-full overflow-y-auto bg-background">
      <MobileTeacherHeader />

      <PageShell
        narrow="centered"
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

  const [placeName, setPlaceName] = useState('');
  const [address, setAddress] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoom, setNewRoom] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState('');
  // The add-room form stays collapsed behind a card until the teacher opens it.
  const [addingRoom, setAddingRoom] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  // Coords from the Google Place behind the address (null until a place is
  // picked, and cleared again the moment the name is edited by hand).
  const [placeCoords, setPlaceCoords] = useState<
    { lat: number | null; lon: number | null; placeId: string | null } | null
  >(null);

  const coordsFromLocation = (loc: typeof primaryLocation) =>
    loc?.lat != null ? { lat: loc.lat, lon: loc.lon, placeId: loc.google_place_id } : null;

  useEffect(() => {
    setPlaceName(primaryLocation?.name ?? '');
    setAddress(primaryLocation?.address ?? '');
    setRooms(parseRooms(primaryLocation?.rooms));
    setPlaceCoords(coordsFromLocation(primaryLocation));
    setNewRoom('');
    setNewRoomCapacity('');
    setAddingRoom(false);
    setPlaceError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryLocation?.id, primaryLocation?.name, primaryLocation?.address, primaryLocation?.rooms]);

  const [isSaving, setIsSaving] = useState(false);

  // Rooms save the moment you add/remove one — so they're a committed action,
  // not part of the dirty form. The bar below only tracks the text fields.
  const isDirty = useMemo(() => {
    const locationDirty = primaryLocation
      ? placeName.trim() !== primaryLocation.name ||
        address.trim() !== (primaryLocation.address ?? '')
      : placeName.trim() !== '' || address.trim() !== '';

    return name.trim() !== seller.name || slug.trim() !== team.slug || locationDirty;
  }, [address, name, placeName, primaryLocation, seller.name, slug, team.slug]);

  const handleCancel = () => {
    setName(seller.name);
    setSlug(team.slug);
    setNameError(null);
    setSlugError(null);
    setPlaceName(primaryLocation?.name ?? '');
    setAddress(primaryLocation?.address ?? '');
    setPlaceCoords(coordsFromLocation(primaryLocation));
    setPlaceError(null);
  };

  // A room's capacity is optional. Treat blank / < 1 as unset (null).
  const normalizeCapacity = (value: number | null): number | null =>
    value != null && Number.isFinite(value) && value >= 1 ? Math.floor(value) : null;

  // Persist the next room list immediately. With a saved place we patch just
  // its rooms; without one, the first room creates the place from the current
  // field values. Reverts the optimistic UI on failure.
  const persistRooms = async (next: Room[], previous: Room[]) => {
    if (primaryLocation) {
      const { error } = await updateLocation(primaryLocation.id, { rooms: next });
      if (error) {
        setRooms(previous);
        toast.error('Kunne ikke lagre rommet.');
      }
      return;
    }

    const trimmedPlaceName = placeName.trim();
    if (!trimmedPlaceName) {
      setRooms(previous);
      setPlaceError('Skriv inn et navn på stedet.');
      return;
    }

    const { error } = await createLocation({
      seller_id: seller.id,
      name: trimmedPlaceName,
      address: address.trim() || null,
      rooms: next,
      lat: placeCoords?.lat ?? null,
      lon: placeCoords?.lon ?? null,
      google_place_id: placeCoords?.placeId ?? null,
    });
    if (error) {
      setRooms(previous);
      toast.error('Kunne ikke lagre rommet.');
      return;
    }
    await refetch();
  };

  const addRoom = () => {
    const trimmed = newRoom.trim();
    if (!trimmed || rooms.some((r) => r.name === trimmed)) {
      setNewRoom('');
      setNewRoomCapacity('');
      return;
    }
    const previous = rooms;
    const next = [
      ...rooms,
      { name: trimmed, capacity: normalizeCapacity(Number(newRoomCapacity)) },
    ];
    setRooms(next);
    setNewRoom('');
    setNewRoomCapacity('');
    setAddingRoom(false);
    void persistRooms(next, previous);
  };

  const cancelAddRoom = () => {
    setNewRoom('');
    setNewRoomCapacity('');
    setAddingRoom(false);
  };

  const removeRoom = (name: string) => {
    const previous = rooms;
    const next = rooms.filter((r) => r.name !== name);

    if (!primaryLocation) {
      setRooms(next);
      return;
    }

    runWithUndo({
      message: 'Rommet er fjernet',
      hide: () => setRooms(next),
      restore: () => setRooms(previous),
      commit: () => updateLocation(primaryLocation.id, { rooms: next }),
      errorOf: (r) => r.error,
      errorMessage: 'Kunne ikke fjerne rommet.',
    });
  };

  // Inline capacity editing: keystrokes update the row optimistically; blur /
  // Enter normalizes and persists only if it changed from the saved value.
  const setRoomCapacityDraft = (name: string, value: string) => {
    const num = value.trim() === '' ? null : Number(value);
    setRooms((prev) =>
      prev.map((r) =>
        r.name === name ? { ...r, capacity: num != null && Number.isFinite(num) ? num : null } : r,
      ),
    );
  };

  const commitRoomCapacity = (name: string) => {
    if (!primaryLocation) return;
    const room = rooms.find((r) => r.name === name);
    if (!room) return;
    const normalized = normalizeCapacity(room.capacity);
    const next = rooms.map((r) => (r.name === name ? { ...r, capacity: normalized } : r));
    setRooms(next);
    const saved = parseRooms(primaryLocation.rooms).find((r) => r.name === name)?.capacity ?? null;
    if (normalized === saved) return;
    void persistRooms(next, parseRooms(primaryLocation.rooms));
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

    if ((primaryLocation || trimmedAddress || rooms.length > 0) && !trimmedPlaceName) {
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

      const shouldPersistLocation =
        !!primaryLocation || !!trimmedPlaceName || !!trimmedAddress || rooms.length > 0;
      if (shouldPersistLocation) {
        const payload = {
          name: trimmedPlaceName,
          address: trimmedAddress || null,
          rooms,
          lat: placeCoords?.lat ?? null,
          lon: placeCoords?.lon ?? null,
          google_place_id: placeCoords?.placeId ?? null,
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

    const previousUrl = seller.logo_url;
    setSavingPhoto(true);
    try {
      const { url, error: uploadError } = await uploadSellerLogo(seller.id, file);
      if (uploadError || !url) throw uploadError ?? new Error('Kunne ikke laste opp bildet.');

      const { error } = await updateSeller(seller.id, { logo_url: url });
      if (error) {
        // Row still points at the old logo — drop the just-uploaded orphan.
        void deleteSellerLogo(seller.id, url);
        throw error;
      }

      setLogoUrl(url);

      if (previousUrl && previousUrl !== url) {
        void deleteSellerLogo(seller.id, previousUrl);
      }
      await onSaved();
      toast.success('Bilde oppdatert');
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
    const previousUrl = seller.logo_url;
    setSavingPhoto(true);
    const { error } = await updateSeller(seller.id, { logo_url: null });
    setSavingPhoto(false);
    if (error) {
      toast.error('Kunne ikke fjerne bildet.');
      return;
    }
    setLogoUrl(null);
    if (previousUrl) {
      void deleteSellerLogo(seller.id, previousUrl);
    }
    await onSaved();
    toast.success('Bilde fjernet');
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
    <div className="space-y-10">
      <SettingsSection
        title="Studioprofil"
        description="Vises på den offentlige studiosiden din."
      >
        <Card>
          <CardContent className="space-y-6">
            <div className="grid gap-3">
              <span className="text-sm font-medium text-foreground">Profilbilde</span>
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
          </CardContent>
        </Card>
      </SettingsSection>

      <SettingsSection
        title="Sted og rom"
        description="Brukes når du lager kurs, og vises til deltakerne som skal møte opp."
      >
        <Card>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <label
                htmlFor="studio-place-name"
                data-error={!!placeError || undefined}
                className="text-sm font-medium text-foreground data-[error=true]:text-danger"
              >
                Stedsnavn
              </label>
              <PlacesAutocomplete
                id="studio-place-name"
                value={placeName}
                onChange={(v) => {
                  setPlaceName(v);
                  // The name field is the search box — typing means you're after a
                  // different place, so the picked address + coords no longer apply.
                  setAddress('');
                  setPlaceCoords(null);
                  if (placeError) setPlaceError(null);
                }}
                onSelect={(place: PlaceDetails) => {
                  setPlaceName(place.name || placeName);
                  setAddress(place.address);
                  setPlaceCoords({ lat: place.lat, lon: place.lon, placeId: place.placeId });
                  setPlaceError(null);
                }}
                onKeyDown={handleKeyDown}
                disabled={isSaving || loadingLocations}
                placeholder="Søk etter studio eller adresse…"
                aria-invalid={!!placeError || undefined}
                aria-describedby={placeError ? 'studio-place-error' : undefined}
              />
              {placeError && <FieldError id="studio-place-error">{placeError}</FieldError>}
              {/* Address is derived from the picked place — shown for confirmation,
                  not editable. Re-pick from the search to change it. */}
              {address && <p className="text-sm text-foreground-muted">{address}</p>}
              {(placeCoords?.placeId != null ||
                (placeCoords?.lat != null && placeCoords?.lon != null)) && (
                <MapEmbed
                  placeId={placeCoords.placeId}
                  lat={placeCoords.lat}
                  lon={placeCoords.lon}
                  title={`Kart over ${placeName}`}
                  className="mt-1 h-44"
                />
              )}
            </div>

            <div className="grid gap-3">
              <div>
                <span className="text-sm font-medium text-foreground">Rom</span>
                <p className="mt-1 text-sm text-foreground-muted">
                  Sett antall plasser per rom. Da fylles det inn automatisk når du bruker rommet på et kurs.
                </p>
              </div>

              {rooms.length > 0 && (
                <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
                  {rooms.map((room) => (
                    <div key={room.name} className="flex items-center gap-3 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {room.name}
                      </span>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={room.capacity == null ? '' : String(room.capacity)}
                        onChange={(e) => setRoomCapacityDraft(room.name, e.target.value)}
                        onBlur={() => commitRoomCapacity(room.name)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            (e.currentTarget as HTMLInputElement).blur();
                          }
                        }}
                        disabled={isSaving || loadingLocations}
                        placeholder="–"
                        aria-label={`Antall plasser i ${room.name}`}
                        className="h-8 w-16 shrink-0 text-center"
                      />
                      <span className="shrink-0 text-sm text-foreground-muted">plasser</span>
                      <button
                        type="button"
                        onClick={() => removeRoom(room.name)}
                        className="flex size-7 shrink-0 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-active hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/15"
                        aria-label={`Fjern ${room.name}`}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {addingRoom ? (
                <div className="flex items-center gap-3">
                  <Input
                    autoFocus
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addRoom();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelAddRoom();
                      }
                    }}
                    disabled={isSaving || loadingLocations}
                    placeholder="Sal 1, behandlingsrom, ute…"
                    aria-label="Navn på rom"
                    className="h-8 min-w-0 flex-1"
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={newRoomCapacity}
                    onChange={(e) => setNewRoomCapacity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addRoom();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelAddRoom();
                      }
                    }}
                    disabled={isSaving || loadingLocations}
                    placeholder="–"
                    aria-label="Antall plasser"
                    className="h-8 w-16 shrink-0 text-center"
                  />
                  <span className="shrink-0 text-sm text-foreground-muted">plasser</span>
                  <button
                    type="button"
                    onClick={addRoom}
                    disabled={!newRoom.trim()}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-active hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/15 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-foreground-muted"
                    aria-label="Legg til rom"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelAddRoom}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-active hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/15"
                    aria-label="Avbryt"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingRoom(true)}
                  disabled={isSaving || loadingLocations}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface px-3 py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="size-4" />
                  Legg til rom
                </button>
              )}
            </div>

            {additionalLocations.length > 0 && (
              <div className="border-t border-border pt-6">
                <p className="text-sm font-medium text-foreground">Andre lagrede steder</p>
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
          </CardContent>
        </Card>
      </SettingsSection>

      <DirtyFormBar
        visible={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}

export default StudioPage;
