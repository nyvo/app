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
import { PageShell } from '@/components/teacher/PageShell';
import { SegmentedTabs } from '@/components/teacher/SegmentedTabs';
import { SettingsRows, SettingsRow } from '@/components/teacher/SettingsRows';
import { AffiliationsSection } from '@/components/teacher/studio/AffiliationsSection';
import { EmbedCodeSection } from '@/components/teacher/studio/EmbedCodeSection';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyError } from '@/lib/error-messages';
import { extractEdgeError } from '@/lib/edge-errors';
import { supabase } from '@/lib/supabase';
import { fetchGuestHost, type GuestHost } from '@/services/affiliations';
import { renameSellerSlug, updateSeller } from '@/services/sellers';
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

  const [tab, setTab] = useState<'profil' | 'samarbeid'>('profil');
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

  const [isSaving, setIsSaving] = useState(false);
  // Generic save failure (thrown/network) — field-specific errors go to the
  // inline FieldErrors instead; this feeds the DirtyFormBar's error slot.
  const [saveError, setSaveError] = useState<string | null>(null);

  const isDirty = name.trim() !== seller.name || slug.trim() !== seller.slug;

  const { blocker } = useUnsavedChanges(isDirty);

  const handleCancel = () => {
    setName(seller.name);
    setSlug(seller.slug);
    setNameError(null);
    setSlugError(null);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setSaveError(null);

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

    if (blocked) {
      // Surface the offending field by jumping to its tab, then focus it once
      // the panel has rendered — a tab switch alone leaves keyboard/AT users
      // without a cue for which field needs attention.
      setTab('profil');
      const focusId = nameInvalid ? 'studio-name' : 'studio-slug';
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
              hydrateFailed={hydrateFailed}
            />

            {/* Own-website embed snippet — lives here (not its own page/tab):
                it's storefront distribution, and the slug two rows up is what
                the embed URL is built from. Needs a live slug to render. */}
            {!!seller.slug && <EmbedCodeSection slug={seller.slug} />}
          </SettingsRows>
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
        // Stays visible on Samarbeid too — hiding it on tab switch would
        // silently strand unsaved Profil changes. Save still works from any
        // tab (it operates on this page's state, not the visible panel); the
        // hint just points back to where the changed field lives.
        visible={isDirty || !!saveError}
        error={saveError}
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={handleCancel}
        dirtyLabel={
          tab === 'samarbeid' ? 'Endringene ligger på Profil-fanen' : undefined
        }
      />
      <UnsavedChangesDialog blocker={blocker} />
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
