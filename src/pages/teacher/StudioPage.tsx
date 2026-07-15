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
import { ImageField } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { LocationField, type LocationCoords } from '@/components/ui/location-field';
import { PageShell } from '@/components/teacher/PageShell';
import { SegmentedTabs } from '@/components/teacher/SegmentedTabs';
import { Switch } from '@/components/ui/switch';
import { SettingsRows, SettingsRow } from '@/components/teacher/SettingsRows';
import { AffiliationsSection } from '@/components/teacher/studio/AffiliationsSection';
import { EmbedCodeSection } from '@/components/teacher/studio/EmbedCodeSection';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyError } from '@/lib/error-messages';
import { extractEdgeError } from '@/lib/edge-errors';
import { supabase } from '@/lib/supabase';
import { fetchGuestHost, type GuestHost } from '@/services/affiliations';
import {
  fetchStudioAddress,
  renameSellerSlug,
  saveStudioAddress,
  updateSeller,
  type StudioAddress,
} from '@/services/sellers';
import { deleteSellerLogo, uploadSellerLogo } from '@/services/storage';
import type { Seller } from '@/types/database';

type HostStudio = GuestHost['host'];

const StudioPage = () => {
  const { currentSeller, refreshSellers, currentSellerHydrateFailed } = useAuth();

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
            hydrateFailed={currentSellerHydrateFailed}
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
  hydrateFailed,
}: {
  seller: Seller;
  onSaved: () => Promise<void> | void;
  hydrateFailed: boolean;
}) {
  const isStudio = seller.operating_model === 'studio';

  const { hash } = useLocation();

  // The host storefront this seller's courses show on, if any. Loaded once here
  // because it gates the Samarbeid tab's visibility (a solo seller only sees the
  // tab while an affiliation is active). `undefined` while the fetch is in
  // flight; `'error'` when it failed — distinct from `null` (no host) so a
  // fetch failure surfaces a retry instead of silently hiding the tab.
  const [host, setHost] = useState<HostStudio | null | undefined | 'error'>(undefined);
  const loadHost = useCallback(async () => {
    const { data, error } = await fetchGuestHost(seller.id);
    setHost(error ? 'error' : (data?.host ?? null));
  }, [seller.id]);
  useEffect(() => { void loadHost(); }, [loadHost]);

  // Studios keep the tab always; solo sellers only while an affiliation exists.
  // On a host-fetch error keep it reachable when the seller is a studio or
  // deep-linked to #samarbeid, so the failure shows a retry rather than vanishing.
  // A stale-default hydrate can't be trusted to tell studio from solo, so the
  // tab is withheld until a refresh succeeds.
  const hasHost = host != null && host !== 'error';
  const showSamarbeid =
    !hydrateFailed && (isStudio || hasHost || (host === 'error' && hash === '#samarbeid'));

  const [tab, setTab] = useState<'profil' | 'rabatter' | 'samarbeid'>('profil');
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

  // Studio address — the seller's single teacher_locations row. `savedAddress`
  // is the dirty/cancel baseline; undefined until the fetch settles so a slow
  // load can't flag a false dirty state (the field is disabled meanwhile).
  const [savedAddress, setSavedAddress] = useState<StudioAddress | null | undefined>(undefined);
  const [addressName, setAddressName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [addressCoords, setAddressCoords] = useState<LocationCoords | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  // Places search is failing — accept free text, same fallback as the builder.
  const [placesUnavailable, setPlacesUnavailable] = useState(false);

  const applyAddress = useCallback((a: StudioAddress | null) => {
    setAddressName(a?.name ?? '');
    setAddressLine(a?.address ?? '');
    setAddressCoords(a ? { lat: a.lat, lon: a.lon, placeId: a.placeId } : null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await fetchStudioAddress(seller.id);
      if (cancelled) return;
      // A failed read degrades to "no address yet" — saving then writes the
      // canonical row either way (update-or-insert), so nothing is orphaned.
      setSavedAddress(data);
      applyAddress(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [seller.id, applyAddress]);

  // Honor-system discounts — student and honnør/pensjonist are separately
  // priced (the rates routinely differ), each a nullable percent on the
  // seller row (null = off). Toggle + percent are one value on save: off ⇒
  // null, on ⇒ the validated percent.
  const studentDiscount = useDiscountField(seller.student_discount_percent ?? null);
  const seniorDiscount = useDiscountField(seller.senior_discount_percent ?? null);

  const [isSaving, setIsSaving] = useState(false);

  const discountDirty = studentDiscount.dirty || seniorDiscount.dirty;

  const addressDirty =
    savedAddress !== undefined &&
    (addressName.trim() !== (savedAddress?.name ?? '') ||
      (addressCoords?.placeId ?? null) !== (savedAddress?.placeId ?? null));

  const profilDirty = name.trim() !== seller.name || slug.trim() !== seller.slug || addressDirty;
  const isDirty = profilDirty || discountDirty;

  const { blocker } = useUnsavedChanges(isDirty);

  const handleCancel = () => {
    setName(seller.name);
    setSlug(seller.slug);
    if (savedAddress !== undefined) applyAddress(savedAddress);
    studentDiscount.reset();
    seniorDiscount.reset();
    setNameError(null);
    setSlugError(null);
    setAddressError(null);
  };

  const handleSave = async () => {
    if (isSaving) return;

    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();

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

    // The address must resolve to a real Google place (coords) so the
    // storefront map/directions and the course-builder prefill work — same
    // rule as the builder, with the same manual fallback while Places is
    // down. Empty is valid: it clears the address.
    const trimmedAddressName = addressName.trim();
    const addressInvalid =
      addressDirty && !!trimmedAddressName && !addressCoords?.placeId && !placesUnavailable;
    if (addressInvalid) {
      setAddressError('Velg et sted fra listen.');
      blocked = true;
    } else {
      setAddressError(null);
    }

    // Discount on ⇒ the percent must be a real 5–90 value (the DB CHECK
    // enforces the same range).
    for (const field of [studentDiscount, seniorDiscount]) {
      if (field.invalid) {
        field.setError('Velg en rabatt mellom 5 og 90 prosent.');
        blocked = true;
      } else {
        field.setError(null);
      }
    }

    if (blocked) {
      // Surface the offending field by jumping to its tab, then focus it once
      // the panel has rendered — a tab switch alone leaves keyboard/AT users
      // without a cue for which field needs attention.
      const profilInvalid = nameInvalid || slugInvalid || addressInvalid;
      setTab(profilInvalid ? 'profil' : 'rabatter');
      const focusId = nameInvalid
        ? 'studio-name'
        : slugInvalid
          ? 'studio-slug'
          : addressInvalid
            ? 'studio-address'
            : studentDiscount.invalid
              ? 'studio-discount-student'
              : 'studio-discount-senior';
      requestAnimationFrame(() => {
        document.getElementById(focusId)?.focus();
      });
      return;
    }

    setIsSaving(true);
    // Writes are sequential (name → slug) with no rollback. When a later step
    // fails, refresh the seller so the already-persisted steps' baselines
    // update — the bar then only tracks what actually failed, and Avbryt
    // restores values that match the database.
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

      if (addressDirty) {
        const next: StudioAddress | null = trimmedAddressName
          ? {
              name: trimmedAddressName,
              address: addressLine.trim() || null,
              lat: addressCoords?.lat ?? null,
              lon: addressCoords?.lon ?? null,
              placeId: addressCoords?.placeId ?? null,
            }
          : null;
        const { error } = await saveStudioAddress(seller.id, next);
        if (error) {
          setAddressError(friendlyError(error, 'Kunne ikke lagre adressen.'));
          if (persistedAny) await onSaved();
          return;
        }
        persistedAny = true;
        setSavedAddress(next);
        applyAddress(next);
      }

      if (discountDirty) {
        const { error } = await updateSeller(seller.id, {
          student_discount_percent: studentDiscount.next,
          senior_discount_percent: seniorDiscount.next,
        });
        if (error) {
          toast.error(friendlyError(error, 'Kunne ikke lagre rabatten.'));
          if (persistedAny) await onSaved();
          return;
        }
        persistedAny = true;
      }

      await onSaved();
      toast.success('Endringer lagret');
    } catch (err) {
      toast.error(friendlyError(err, 'Kunne ikke lagre endringene.'));
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
          active={tab === 'rabatter'}
          onClick={() => setTab('rabatter')}
          id="studio-tab-rabatter"
          ariaControls="studio-panel-rabatter"
        >
          Rabatter
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
                {nameError && <FieldError id="studio-name-error" className="mt-0">{nameError}</FieldError>}
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
                {slugError && <FieldError id="studio-slug-error" className="mt-0">{slugError}</FieldError>}
              </div>
            </SettingsRow>

            <SettingsRow
              title="Adresse"
              description="Vises på studiosiden og foreslås når du oppretter kurs."
            >
              <div className="grid gap-2">
                <LocationField
                  id="studio-address"
                  value={addressName}
                  coords={addressCoords}
                  address={addressLine || null}
                  disabled={isSaving || savedAddress === undefined}
                  aria-invalid={!!addressError || undefined}
                  aria-describedby={addressError ? 'studio-address-error' : undefined}
                  onChange={(next) => {
                    setAddressName(next.name);
                    setAddressLine(next.address);
                    setAddressCoords(next.coords);
                    if (addressError) setAddressError(null);
                  }}
                  onSearchError={setPlacesUnavailable}
                />
                {addressError && (
                  <FieldError id="studio-address-error" className="mt-0">
                    {addressError}
                  </FieldError>
                )}
              </div>
            </SettingsRow>

            <AccountTypeSection
              seller={seller}
              onChanged={onSaved}
              onBecameSolo={() => setTab('profil')}
              hydrateFailed={hydrateFailed}
            />

            {/* Own-website embed snippet — lives here (not its own page/tab):
                it's storefront distribution, and the slug two rows up is what
                the embed URL is built from. Needs a live slug to render. */}
            {!!seller.slug && <EmbedCodeSection slug={seller.slug} />}
          </SettingsRows>
        </div>
      )}

      {tab === 'rabatter' && (
        <div
          role="tabpanel"
          id="studio-panel-rabatter"
          aria-labelledby="studio-tab-rabatter"
        >
          {/* Same title/description grammar as the SettingsRow headers on the
              Profil tab. The description carries the facts the cards can't:
              who checks eligibility (the studio, not Openspot) and where the
              claims are visible. */}
          <div className="max-w-xl">
            <h2 className="text-base font-medium text-foreground">
              Student- og pensjonistrabatt
            </h2>
            <p className="mt-1 max-w-prose text-pretty text-sm text-foreground-muted">
              Deltakeren velger rabatten selv i kassen. Openspot sjekker ikke om deltakeren
              faktisk er student eller pensjonist — det ansvaret ligger hos deg. Du ser hvem som
              har valgt rabatt i deltakerlisten.
            </p>
          </div>
          {/* Card grammar from the Timeplan agenda cards (rounded-xl bg-panel
              px-5 py-4, base/medium title) — one card per discount, the
              switch as the row's trailing control. */}
          <div className="mt-5 max-w-xl space-y-3">
            <DiscountCard
              title="Studentrabatt"
              id="studio-discount-student"
              field={studentDiscount}
              disabled={isSaving}
            />
            <DiscountCard
              title="Pensjonistrabatt"
              id="studio-discount-senior"
              field={seniorDiscount}
              disabled={isSaving}
            />
          </div>
        </div>
      )}

      {tab === 'samarbeid' && showSamarbeid && (
        <div
          role="tabpanel"
          id="studio-panel-samarbeid"
          aria-labelledby="studio-tab-samarbeid"
        >
          {!isStudio && host === 'error' ? (
            // Solo seller: the whole panel is the guest-host card, so a failed
            // fetch replaces it with a retry.
            <ErrorState
              title="Kunne ikke hente info"
              message=""
              onRetry={() => void loadHost()}
            />
          ) : (
            // Studio: the invite link + instructor list don't depend on the
            // guest-host fetch, so a failure only drops the optional "Vises hos"
            // sub-card (host coerced to null) — the rest stays usable.
            <AffiliationsSection
              seller={seller}
              host={host === 'error' ? null : host}
              onHostChange={setHost}
            />
          )}
        </div>
      )}

      <DirtyFormBar
        // Stays visible on every tab — hiding it on tab switch would silently
        // strand unsaved changes. Save still works from any tab (it operates
        // on this page's state, not the visible panel); the hint just points
        // back to the tab where the changed field lives.
        visible={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={handleCancel}
        dirtyLabel={
          profilDirty && tab !== 'profil'
            ? 'Endringene ligger på Profil-fanen'
            : discountDirty && !profilDirty && tab !== 'rabatter'
              ? 'Endringene ligger på Rabatter-fanen'
              : undefined
        }
      />
      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Honor-system discount field — toggle + percent as one nullable value.
// ---------------------------------------------------------------------------

interface DiscountFieldState {
  enabled: boolean;
  setEnabled: (next: boolean) => void;
  percent: string;
  setPercent: (next: string) => void;
  error: string | null;
  setError: (next: string | null) => void;
  /** The value to persist: null when off (or unparseable), else the percent. */
  next: number | null;
  dirty: boolean;
  /** On, but the percent isn't a real 5–90 value. */
  invalid: boolean;
  reset: () => void;
}

export function useDiscountField(saved: number | null): DiscountFieldState {
  const [enabled, setEnabled] = useState(saved != null);
  const [percent, setPercent] = useState(saved?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  // Re-baseline when the seller row refreshes (post-save / seller switch).
  useEffect(() => {
    setEnabled(saved != null);
    setPercent(saved?.toString() ?? '');
  }, [saved]);

  const parsed = parseInt(percent, 10);
  const next = enabled && Number.isFinite(parsed) ? parsed : null;
  return {
    enabled,
    setEnabled,
    percent,
    setPercent,
    error,
    setError,
    next,
    dirty: enabled !== (saved != null) || (enabled && next !== saved),
    invalid: enabled && (!Number.isFinite(parsed) || parsed < 5 || parsed > 90),
    reset: () => {
      setEnabled(saved != null);
      setPercent(saved?.toString() ?? '');
      setError(null);
    },
  };
}

/** One discount as an agenda-style card (Timeplan card shell): title +
 *  switch on the top line, the percent input below when enabled. */
export function DiscountCard({
  title,
  id,
  field,
  disabled,
}: {
  title: string;
  id: string;
  field: DiscountFieldState;
  disabled: boolean;
}) {
  return (
    <div className="rounded-xl bg-panel px-5 py-4">
      <div className="flex items-center justify-between gap-6">
        <p className="text-base font-medium text-foreground">{title}</p>
        <Switch
          checked={field.enabled}
          disabled={disabled}
          onCheckedChange={(next) => {
            field.setEnabled(next);
            if (!next) field.setError(null);
          }}
          aria-label={title}
        />
      </div>
      {field.enabled && (
        <div className="mt-3 flex items-center gap-2.5">
          <label htmlFor={id} className="text-sm text-foreground-muted">
            Rabatt
          </label>
          <div className="relative inline-flex items-center">
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              min={5}
              max={90}
              step={5}
              value={field.percent}
              onChange={(e) => {
                field.setPercent(e.target.value);
                if (field.error) field.setError(null);
              }}
              disabled={disabled}
              aria-invalid={!!field.error || undefined}
              aria-describedby={field.error ? `${id}-error` : undefined}
              className="h-8 w-[100px] pr-8 text-sm tabular-nums"
            />
            <span className="pointer-events-none absolute right-3 select-none text-sm text-foreground-muted">
              %
            </span>
          </div>
        </div>
      )}
      {field.error && (
        <FieldError id={`${id}-error`} className="mt-2">
          {field.error}
        </FieldError>
      )}
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
  hydrateFailed,
}: {
  seller: Seller;
  onChanged: () => Promise<void> | void;
  onBecameSolo: () => void;
  hydrateFailed: boolean;
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

  if (hydrateFailed) {
    // operating_model is a stale safe-default here — showing the switch could
    // render a studio as "Jeg underviser selv". Offer a retry instead.
    return (
      <SettingsRow
        title="Kontotype"
        description="Styrer hva du ser i verktøyet. Du kan endre når som helst."
      >
        <ErrorState
          title="Kunne ikke hente kontoinformasjon"
          message="Prøv igjen om litt."
          onRetry={() => void onChanged()}
        />
      </SettingsRow>
    );
  }

  return (
    <SettingsRow
      title="Kontotype"
      description="Styrer hva du ser i verktøyet. Du kan endre når som helst."
    >
      {/* Same segmented switch as the course builder's Enkelttime/Kursrekke
          choice — the shared two-option control, not cards or radios. */}
      <div>
        <SegmentedTabs<'solo' | 'studio'>
          value={current}
          disabled={pending}
          onChange={(picked) => {
            if (picked !== current && !pending) setConfirmTarget(picked);
          }}
          tabs={[
            { key: 'solo', label: 'Jeg underviser selv' },
            { key: 'studio', label: 'Jeg driver et studio' },
          ]}
          ariaLabel="Kontotype"
          role="radiogroup"
          stretch="sm"
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
