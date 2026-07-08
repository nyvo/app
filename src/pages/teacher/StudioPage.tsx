import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { ExternalLink } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
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
import { PageShell } from '@/components/teacher/PageShell';
import { SegmentedTabs } from '@/components/teacher/SegmentedTabs';
import { SettingsRows, SettingsRow } from '@/components/teacher/SettingsRows';
import { AffiliationsSection } from '@/components/teacher/studio/AffiliationsSection';
import { EmbedCodeSection } from '@/components/teacher/studio/EmbedCodeSection';
import { useAuth } from '@/contexts/AuthContext';
import { useLocations } from '@/hooks/use-locations';
import { friendlyError } from '@/lib/error-messages';
import { extractEdgeError } from '@/lib/edge-errors';
import { supabase } from '@/lib/supabase';
import { createLocation, updateLocation } from '@/services/locations';
import { fetchGuestHost, type GuestHost } from '@/services/affiliations';
import { renameSellerSlug, updateSeller } from '@/services/sellers';
import { deleteSellerLogo, uploadSellerLogo } from '@/services/storage';
import type { Seller } from '@/types/database';

type HostStudio = GuestHost['host'];

const StudioPage = () => {
  const { currentSeller, refreshSellers } = useAuth();

  return (
    <PageShell
        title="Studio"
        action={
          currentSeller?.slug ? (
            <Button onClick={() => window.open(`/${currentSeller.slug}`, '_blank')}>
              <ExternalLink data-icon="inline-start" />
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
  const [tab, setTab] = useState<'profil' | 'sted' | 'samarbeid' | 'nettsted'>('profil');
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
    setPlaceCoords(coordsFromLocation(primaryLocation));
    setPlaceError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryLocation?.id, primaryLocation?.name, primaryLocation?.address]);

  const [isSaving, setIsSaving] = useState(false);
  // Generic save failure (thrown/network) — field-specific errors go to the
  // inline FieldErrors instead; this feeds the DirtyFormBar's error slot.
  const [saveError, setSaveError] = useState<string | null>(null);

  // Split by which tab the dirty field lives on — the Samarbeid/Nettsted tabs
  // keep the bar visible while dirty (rather than hiding it on tab switch),
  // and need to know which tab to point the user back to.
  const profileDirty = name.trim() !== seller.name || slug.trim() !== seller.slug;
  const locationDirty = primaryLocation
    ? placeName.trim() !== primaryLocation.name ||
      address.trim() !== (primaryLocation.address ?? '')
    : placeName.trim() !== '' || address.trim() !== '';
  const isDirty = profileDirty || locationDirty;

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

  const handleSave = async () => {
    if (isSaving) return;
    setSaveError(null);

    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();
    const trimmedPlaceName = placeName.trim();
    const trimmedAddress = address.trim();

    let blocked = false;
    const nameInvalid = !trimmedName;
    if (nameInvalid) {
      setNameError('Skriv inn et navn.');
      blocked = true;
    } else {
      setNameError(null);
    }

    const slugInvalid = !trimmedSlug;
    if (slugInvalid) {
      setSlugError('Skriv inn en nettadresse.');
      blocked = true;
    } else {
      setSlugError(null);
    }

    // The place must come from the Google search — free text has no coords, so
    // buyers would get a location line with no map or directions. Only enforced
    // when the name changed, so legacy pin-less places can still save untouched.
    const placeChanged = trimmedPlaceName !== (primaryLocation?.name ?? '');
    let placeInvalid = false;
    if ((primaryLocation || trimmedAddress) && !trimmedPlaceName) {
      setPlaceError('Skriv inn et navn på stedet.');
      blocked = true;
      placeInvalid = true;
    } else if (trimmedPlaceName && placeChanged && !placeCoords?.placeId) {
      setPlaceError('Velg et sted fra listen.');
      blocked = true;
      placeInvalid = true;
    } else {
      setPlaceError(null);
    }

    if (blocked) {
      // Surface the offending field by jumping to its tab, then focus it once
      // the panel has rendered — a tab switch alone leaves keyboard/AT users
      // without a cue for which field needs attention.
      setTab(nameInvalid || slugInvalid ? 'profil' : 'sted');
      const focusId = nameInvalid ? 'studio-name' : slugInvalid ? 'studio-slug' : placeInvalid ? 'studio-place-name' : null;
      if (focusId) {
        requestAnimationFrame(() => {
          document.getElementById(focusId)?.focus();
        });
      }
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

      const shouldPersistLocation = !!primaryLocation || !!trimmedPlaceName || !!trimmedAddress;
      if (shouldPersistLocation) {
        const payload = {
          name: trimmedPlaceName,
          address: trimmedAddress || null,
          lat: placeCoords?.lat ?? null,
          lon: placeCoords?.lon ?? null,
          google_place_id: placeCoords?.placeId ?? null,
        };
        const result = primaryLocation
          ? await updateLocation(primaryLocation.id, payload)
          : await createLocation({ seller_id: seller.id, ...payload });

        if (result.error) {
          setPlaceError(friendlyError(result.error, 'Kunne ikke lagre stedet.'));
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
      toast.error(isLocalValidation ? err.message : friendlyError(err, 'Kunne ikke laste opp bildet'));
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
      toast.error('Kunne ikke fjerne bildet');
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
        {!!seller.slug && (
          <PageTab
            active={tab === 'nettsted'}
            onClick={() => setTab('nettsted')}
            id="studio-tab-nettsted"
            ariaControls="studio-panel-nettsted"
          >
            Nettsted
          </PageTab>
        )}
      </PageTabs>

      {locationsError ? (
        <ErrorState
          title="Kunne ikke hente studioet ditt"
          message="Sjekk forbindelsen og prøv igjen."
          onRetry={() => void refetch()}
        />
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

      {tab === 'nettsted' && !!seller.slug && (
        <div
          role="tabpanel"
          id="studio-panel-nettsted"
          aria-labelledby="studio-tab-nettsted"
        >
          <SettingsRows>
            <EmbedCodeSection slug={seller.slug} />
          </SettingsRows>
        </div>
      )}
        </>
      )}

      <DirtyFormBar
        // Stays visible on Samarbeid/Nettsted too — hiding it on tab switch
        // would silently strand unsaved Profil/Sted changes. Save still works
        // from any tab (it operates on this page's state, not the visible
        // panel); the hint just points back to where the changed field lives.
        visible={isDirty || !!saveError}
        error={saveError}
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={handleCancel}
        dirtyLabel={
          tab === 'samarbeid' || tab === 'nettsted'
            ? profileDirty && locationDirty
              ? 'Endringene ligger på Profil- og Sted-fanen'
              : locationDirty
                ? 'Endringene ligger på Sted-fanen'
                : 'Endringene ligger på Profil-fanen'
            : undefined
        }
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
// Picking the other option asks for confirmation, then applies (no save
// button); the selection is derived from the seller row, so an error leaves
// it on the original value.
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
  // The option waiting on the confirm dialog; null = dialog closed.
  const [confirmTarget, setConfirmTarget] = useState<'solo' | 'studio' | null>(null);
  // DB column is plain text — same narrowing as the page's isStudio check.
  const current: 'solo' | 'studio' =
    seller.operating_model === 'studio' ? 'studio' : 'solo';

  const handleConfirm = async () => {
    const picked = confirmTarget;
    if (!picked || pending || picked === current) return;
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
          ? 'Fjern tilknyttede instruktører først'
          : 'Kunne ikke endre kontotypen',
      );
      setPending(false);
      setConfirmTarget(null);
      return;
    }
    await onChanged();
    toast.success('Kontotypen er oppdatert');
    if (picked === 'solo') onBecameSolo();
    setPending(false);
    setConfirmTarget(null);
  };

  return (
    <SettingsRow
      title="Kontotype"
      description="Styrer hva du ser i verktøyet. Du kan endre når som helst."
    >
      {/* Same segmented switch as the course builder's Enkelttime/Kursrekke
          choice — the shared two-option control, not cards or radios. */}
      <div className={pending ? 'pointer-events-none opacity-60' : undefined}>
        <SegmentedTabs<'solo' | 'studio'>
          value={current}
          onChange={(picked) => {
            if (picked !== current && !pending) setConfirmTarget(picked);
          }}
          tabs={[
            { key: 'solo', label: 'Jeg underviser selv' },
            { key: 'studio', label: 'Jeg driver et studio' },
          ]}
          ariaLabel="Kontotype"
          role="radiogroup"
        />
        <p className="mt-3 text-sm text-foreground-muted">
          {current === 'solo'
            ? 'Egen side med kursene dine.'
            : 'Studioside med egne og tilknyttede instruktører.'}
        </p>
      </div>

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirmTarget(null);
        }}
        title="Bytt kontotype"
        body={
          confirmTarget === 'studio' ? (
            <>Du bytter til <strong>Jeg driver et studio</strong> og får en studioside med egne og tilknyttede instruktører.</>
          ) : (
            <>Du bytter til <strong>Jeg underviser selv</strong> og får en egen side med kursene dine.</>
          )
        }
        actionLabel="Bytt kontotype"
        onConfirm={() => void handleConfirm()}
        loading={pending}
        loadingText="Bytter"
      />
    </SettingsRow>
  );
}

export default StudioPage;
