import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, ExternalLink, Plus, X } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { DirtyFormBar } from '@/components/ui/dirty-form-bar';
import { UnsavedChangesDialog, useUnsavedChanges } from '@/components/ui/unsaved-changes';
import { PageTab, PageTabs } from '@/components/ui/page-tabs';
import { FieldError } from '@/components/ui/field-error';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { DelayedFallback } from '@/components/ui/delayed-fallback';
import { ImageField } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlacesAutocomplete } from '@/components/ui/places-autocomplete';
import { MapEmbed } from '@/components/ui/map-embed';
import type { PlaceDetails } from '@/services/places';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { PageShell } from '@/components/teacher/PageShell';
import { SettingsRows, SettingsRow } from '@/components/teacher/SettingsRows';
import { AffiliationsSection } from '@/components/teacher/studio/AffiliationsSection';
import { EmbedCodeSection } from '@/components/teacher/studio/EmbedCodeSection';
import { useAuth } from '@/contexts/AuthContext';
import { useLocations } from '@/hooks/use-locations';
import { friendlyError } from '@/lib/error-messages';
import { extractEdgeError } from '@/lib/edge-errors';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { createLocation, updateLocation } from '@/services/locations';
import { fetchGuestHost, type GuestHost } from '@/services/affiliations';
import { parseRooms, type Room } from '@/lib/rooms';
import { runWithUndo } from '@/lib/undo';
import { renameSellerSlug, updateSeller } from '@/services/sellers';
import { deleteSellerLogo, uploadSellerLogo } from '@/services/storage';
import type { Seller } from '@/types/database';

type HostStudio = GuestHost['host'];

const StudioPage = () => {
  const { currentSeller, refreshSellers } = useAuth();

  return (
    <main className="flex-1 min-h-full overflow-y-auto bg-canvas">
      <MobileTeacherHeader />

      <PageShell
        title="Studio"
        action={
          currentSeller?.slug ? (
            <Button onClick={() => window.open(`/${currentSeller.slug}`, '_blank')}>
              <ExternalLink className="size-4" />
              Se siden din
            </Button>
          ) : null
        }
      >
        {currentSeller ? (
          <StudioPublicSettings
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
  seller,
  onSaved,
}: {
  seller: Seller;
  onSaved: () => Promise<void> | void;
}) {
  const { locations, isLoading: loadingLocations, error: locationsError, refetch } = useLocations(seller.id);
  const primaryLocation = locations[0] ?? null;

  const isStudio = seller.operating_model === 'studio';

  // The host storefront this seller's courses show on, if any. Loaded once here
  // because it gates the Samarbeid tab's visibility (a solo seller only sees the
  // tab while an affiliation is active). `undefined` while the fetch is in
  // flight — the tab simply appears when it lands.
  const [host, setHost] = useState<HostStudio | null | undefined>(undefined);
  const loadHost = useCallback(async () => {
    const { data, error } = await fetchGuestHost(seller.id);
    setHost(error ? null : (data?.host ?? null));
  }, [seller.id]);
  useEffect(() => { void loadHost(); }, [loadHost]);

  // Studios keep the tab always; solo sellers only while an affiliation exists.
  const showSamarbeid = isStudio || host != null;

  const { hash } = useLocation();
  const [tab, setTab] = useState<'profil' | 'sted' | 'samarbeid'>('profil');
  // Joining a studio lands at /studio#samarbeid — open that tab once it renders.
  useEffect(() => {
    if (hash === '#samarbeid' && showSamarbeid) setTab('samarbeid');
  }, [hash, showSamarbeid]);
  // The tab can vanish (solo revoke, or a studio switching to solo with no host)
  // — don't strand the user on a hidden panel.
  useEffect(() => {
    if (!showSamarbeid && tab === 'samarbeid') setTab('profil');
  }, [showSamarbeid, tab]);

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

  const [slug, setSlug] = useState(seller.slug);
  const [slugError, setSlugError] = useState<string | null>(null);
  useEffect(() => {
    setSlug(seller.slug);
  }, [seller.slug]);

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
  // Generic save failure (thrown/network) — field-specific errors go to the
  // inline FieldErrors instead; this feeds the DirtyFormBar's error slot.
  const [saveError, setSaveError] = useState<string | null>(null);

  // Rooms save the moment you add/remove one — so they're a committed action,
  // not part of the dirty form. The bar below only tracks the text fields.
  const isDirty = useMemo(() => {
    const locationDirty = primaryLocation
      ? placeName.trim() !== primaryLocation.name ||
        address.trim() !== (primaryLocation.address ?? '')
      : placeName.trim() !== '' || address.trim() !== '';

    return name.trim() !== seller.name || slug.trim() !== seller.slug || locationDirty;
  }, [address, name, placeName, primaryLocation, seller.name, slug, seller.slug]);

  const { blocker } = useUnsavedChanges(isDirty);

  const handleCancel = () => {
    setName(seller.name);
    setSlug(seller.slug);
    setNameError(null);
    setSlugError(null);
    setSaveError(null);
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
    setSaveError(null);

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

    if (blocked) {
      // Surface the offending field by jumping to its tab.
      setTab(!trimmedName || !trimmedSlug ? 'profil' : 'sted');
      return;
    }

    setIsSaving(true);
    // Writes are sequential (name → slug → place) with no rollback. When a
    // later step fails, refresh the seller so the already-persisted steps'
    // baselines update — the bar then only tracks what actually failed, and
    // Avbryt restores values that match the database.
    let persistedAny = false;
    try {
      if (trimmedName !== seller.name) {
        const { error } = await updateSeller(seller.id, { name: trimmedName });
        if (error) {
          setNameError(friendlyError(error, 'Kunne ikke lagre navnet.'));
          return;
        }
        persistedAny = true;
        setName(trimmedName);
      }

      if (trimmedSlug !== seller.slug) {
        const { slug: nextSlug, error } = await renameSellerSlug(seller.id, trimmedSlug);
        if (error || !nextSlug) {
          const msg = error?.message ?? '';
          if (msg.includes('already taken')) setSlugError('Denne nettadressen er opptatt. Velg en annen.');
          else if (msg.includes('reserved')) setSlugError('Denne nettadressen er reservert. Velg en annen.');
          else if (msg.includes('at least 3')) setSlugError('Bruk minst 3 tegn.');
          else setSlugError(friendlyError(error, 'Kunne ikke endre nettadressen.'));
          if (persistedAny) await onSaved();
          return;
        }
        persistedAny = true;
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
          if (persistedAny) await onSaved();
          return;
        }
        await refetch();
      }

      await onSaved();
      toast.success('Endringer lagret');
    } catch (err) {
      setSaveError(friendlyError(err, 'Kunne ikke lagre endringene.'));
      if (persistedAny) await onSaved();
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
    <div>
      <PageTabs ariaLabel="Studioseksjoner" className="mb-8">
        <PageTab
          active={tab === 'profil'}
          onClick={() => setTab('profil')}
          id="studio-tab-profil"
          ariaControls="studio-panel-profil"
        >
          Profil
        </PageTab>
        <PageTab
          active={tab === 'sted'}
          onClick={() => setTab('sted')}
          id="studio-tab-sted"
          ariaControls="studio-panel-sted"
        >
          Sted
        </PageTab>
        {showSamarbeid && (
          <PageTab
            active={tab === 'samarbeid'}
            onClick={() => setTab('samarbeid')}
            id="studio-tab-samarbeid"
            ariaControls="studio-panel-samarbeid"
          >
            Samarbeid
          </PageTab>
        )}
      </PageTabs>

      {locationsError ? (
        <div className="rounded-xl border border-card bg-background p-6 sm:p-10">
          <ErrorState
            title="Kunne ikke hente studioet ditt"
            message="Sjekk forbindelsen og prøv igjen."
            onRetry={() => void refetch()}
          />
        </div>
      ) : loadingLocations ? (
        // Skeleton held back 200ms (Studio § 10 — no flash-loader for
        // sub-second loads); tabs above stay visible, only the panel is replaced.
        <DelayedFallback>
          <StudioRowsSkeleton />
        </DelayedFallback>
      ) : (
        <>
      {tab === 'profil' && (
        <div
          role="tabpanel"
          id="studio-panel-profil"
          aria-labelledby="studio-tab-profil"
        >
          <SettingsRows>
            <SettingsRow title="Profilbilde" description="Vises på studiosiden din.">
              <ImageField
                variant="avatar"
                value={logoUrl}
                onChange={handlePhotoSelected}
                onRemove={handlePhotoRemove}
                loading={savingPhoto}
                changeLabel="Endre"
                ariaLabel="Last opp profilbilde"
              />
            </SettingsRow>

            <SettingsRow title="Navn" description="Navnet kundene ser på studiosiden.">
              <div className="grid gap-2">
                <Input
                  id="studio-name"
                  aria-label="Navn"
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
            </SettingsRow>

            <SettingsRow
              title="Nettadresse"
              description="Den offentlige adressen til studiosiden din."
            >
              <div className="grid gap-2">
                <InputGroup data-disabled={isSaving || undefined}>
                  <InputGroupAddon align="inline-start">openspot.no/</InputGroupAddon>
                  <InputGroupInput
                    id="studio-slug"
                    type="text"
                    aria-label="Nettadresse"
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
            </SettingsRow>

            {seller.slug && <EmbedCodeSection slug={seller.slug} />}

            <AccountTypeSection
              seller={seller}
              onChanged={onSaved}
              onBecameSolo={() => setTab('profil')}
            />
          </SettingsRows>
        </div>
      )}

      {tab === 'sted' && (
        <div
          role="tabpanel"
          id="studio-panel-sted"
          aria-labelledby="studio-tab-sted"
        >
          <SettingsRows>
            <SettingsRow
              title="Sted"
              description="Brukes når du lager kurs, og vises til deltakerne som skal møte opp."
            >
              <div className="grid gap-2">
                <Label htmlFor="studio-place-name" data-error={!!placeError || undefined}>
                  Stedsnavn
                </Label>
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
            </SettingsRow>

            <SettingsRow
              title="Rom"
              description="Sett antall plasser per rom — fylles inn automatisk når du bruker rommet på et kurs."
            >
              <div className="space-y-3">
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
            </SettingsRow>
          </SettingsRows>
        </div>
      )}

      {tab === 'samarbeid' && showSamarbeid && (
        <div
          role="tabpanel"
          id="studio-panel-samarbeid"
          aria-labelledby="studio-tab-samarbeid"
        >
          <AffiliationsSection
            seller={seller}
            host={host}
            onHostChange={setHost}
          />
        </div>
      )}
        </>
      )}

      <DirtyFormBar
        visible={(isDirty || !!saveError) && tab !== 'samarbeid'}
        error={saveError}
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={handleCancel}
      />
      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}

// Placeholder for the settings panel while locations load — mirrors the
// SettingsRows rhythm (220px label column + capped control column) so the tab
// content doesn't jump when the fetch lands.
function StudioRowsSkeleton() {
  return (
    <div className="divide-y divide-border-subtle" role="status" aria-live="polite">
      <span className="sr-only">Laster…</span>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="grid gap-4 py-8 first:pt-0 last:pb-0 md:grid-cols-[220px_minmax(0,42rem)] md:gap-12"
        >
          <div className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kontotype — self-declared identity that gates which tools the seller sees.
// Picking the other option applies immediately (no save button); the selection
// is derived from the seller row, so an error leaves it on the original value.
// ---------------------------------------------------------------------------

function AccountTypeSection({
  seller,
  onChanged,
  onBecameSolo,
}: {
  seller: Seller;
  onChanged: () => Promise<void> | void;
  onBecameSolo: () => void;
}) {
  const [pending, setPending] = useState(false);
  const current = seller.operating_model;

  const handlePick = async (picked: 'solo' | 'studio') => {
    if (pending || picked === current) return;
    setPending(true);
    const { error } = await supabase.functions.invoke('set-operating-model', {
      body: { sellerId: seller.id, operatingModel: picked },
    });
    if (error) {
      // invoke() wraps non-2xx as FunctionsHttpError; the JSON body (e.g. the
      // 409 { error: 'has_active_affiliates' }) is only readable via the helper.
      const { message } = await extractEdgeError(error);
      toast.error(
        message === 'has_active_affiliates'
          ? 'Fjern tilknyttede instruktører først.'
          : 'Kunne ikke endre kontotypen.',
      );
      setPending(false);
      return;
    }
    await onChanged();
    toast.success('Kontotypen er oppdatert.');
    if (picked === 'solo') onBecameSolo();
    setPending(false);
  };

  return (
    <SettingsRow
      title="Kontotype"
      description="Styrer hva du ser i verktøyet. Du kan endre når som helst."
    >
      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-3" disabled={pending}>
        <legend className="sr-only">Velg kontotype</legend>
        {([
              {
                value: 'solo' as const,
                title: 'Jeg underviser selv',
                body: 'Egen side med kursene dine.',
              },
              {
                value: 'studio' as const,
                title: 'Jeg driver et studio',
                body: 'Studioside med egne og tilknyttede instruktører.',
              },
            ]).map((opt) => {
              const isSelected = current === opt.value;
              return (
                <label
                  key={opt.value}
                  className={cn(
                    'flex items-start gap-3 min-h-[7.5rem] rounded-xl bg-muted p-6 cursor-pointer transition-shadow duration-150 hover:bg-muted/70 focus-within:ring-2 focus-within:ring-foreground',
                    isSelected && 'ring-2 ring-foreground',
                    pending && 'cursor-not-allowed opacity-70',
                  )}
                >
                  <input
                    type="radio"
                    name="operatingModel"
                    value={opt.value}
                    checked={isSelected}
                    onChange={() => { void handlePick(opt.value); }}
                    disabled={pending}
                    className="sr-only"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{opt.title}</p>
                    <p className="mt-1 text-sm text-foreground-muted leading-relaxed">{opt.body}</p>
                  </div>
                  {isSelected && <Check className="size-4 text-foreground shrink-0 mt-1" />}
                </label>
              );
            })}
      </fieldset>
    </SettingsRow>
  );
}

export default StudioPage;
