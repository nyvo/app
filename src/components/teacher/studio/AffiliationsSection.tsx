import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { MoreVertical } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SettingsRows, SettingsRow } from '@/components/teacher/SettingsRows';
import { runWithUndo } from '@/lib/undo';
import { friendlyError } from '@/lib/error-messages';
import {
  fetchHostAffiliates,
  revokeAffiliation,
  type HostAffiliate,
  type GuestHost,
} from '@/services/affiliations';
import type { Seller } from '@/types/database';
import {
  fetchActiveInviteLink,
  createInviteLink,
} from '@/services/invite-links';
import type { SellerInviteLink } from '@/types/database';

// ---------------------------------------------------------------------------
// Samarbeid — lives as a section on the Studio page (it's storefront
// management: what shows on which page). Split by operating model:
//
// Studio (host side):
//   - Invite link panel ("Inviter en instruktør").
//   - Instructors whose courses show on this studio page.
//
// Solo teacher (guest side):
//   - The studio page their courses show on, or an empty state explaining how
//     affiliation works (the tab is always visible for both account types).
//   - "Stopp visning" action.
//
// Joining via /join/:code lands here at /studio#samarbeid — the section
// scrolls itself into view so the join flow ends with visible confirmation.
// ---------------------------------------------------------------------------

// The guest-host state is loaded once at StudioPage level (it gates tab
// visibility) and passed down — this section never re-fetches it. `onHostChange`
// lets a "Stopp visning" here propagate up so the tab hides/refreshes.
export function AffiliationsSection({
  seller,
  host,
  onHostChange,
}: {
  seller: Seller;
  host: HostStudio | null | undefined;
  onHostChange: (host: HostStudio | null) => void;
}) {
  const { hash } = useLocation();
  const anchorRef = useRef<HTMLDivElement>(null);
  const isStudio = seller.operating_model === 'studio';

  useEffect(() => {
    if (hash === '#samarbeid') {
      anchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hash]);

  return (
    <div ref={anchorRef} id="samarbeid" className="scroll-mt-24">
      <SettingsRows>
        {isStudio ? (
          <BusinessView
            hostSellerId={seller.id}
            host={host}
            onHostChange={onHostChange}
          />
        ) : (
          <SettingsRow title="Studio" description="Studioet der kursene dine vises.">
            <IndividualView
              sellerId={seller.id}
              host={host}
              onLeft={() => onHostChange(null)}
            />
          </SettingsRow>
        )}
      </SettingsRows>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Business view — invite card + connected instructors
// ───────────────────────────────────────────────────────────────────────────

function BusinessView({
  hostSellerId,
  host,
  onHostChange,
}: {
  hostSellerId: string;
  host: HostStudio | null | undefined;
  onHostChange: (host: HostStudio | null) => void;
}) {
  const [affiliates, setAffiliates] = useState<HostAffiliate[] | null>(null);
  const [loadingAffiliates, setLoadingAffiliates] = useState(true);
  const [affiliatesError, setAffiliatesError] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());

  const refresh = useCallback(async () => {
    setLoadingAffiliates(true);
    const { data, error } = await fetchHostAffiliates(hostSellerId);
    // A failed fetch must not read as "no instructors yet" — null out the list
    // and flag the error so the panel shows a retry instead of the empty state.
    setAffiliatesError(!!error);
    setAffiliates(error ? null : data);
    setLoadingAffiliates(false);
  }, [hostSellerId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleRevoke = (affiliate: HostAffiliate) => {
    runWithUndo({
      message: `${affiliate.guest.name} vises ikke lenger på studiosiden`,
      hide: () => setHiddenIds((prev) => new Set(prev).add(affiliate.guest_seller_id)),
      restore: () =>
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(affiliate.guest_seller_id);
          return next;
        }),
      commit: async () => {
        const { error } = await revokeAffiliation({ hostSellerId, guestSellerId: affiliate.guest_seller_id });
        if (!error) await refresh();
        return { error };
      },
      errorOf: (r) => r.error,
      errorMessage: 'Kunne ikke fjerne instruktør',
    });
  };

  const visibleAffiliates =
    affiliates?.filter((affiliate) => !hiddenIds.has(affiliate.guest_seller_id)) ?? null;

  return (
    <>
      <SettingsRow
        title="Inviter instruktører"
        description="Del lenken så instruktører kan vise de publiserte kursene sine på studiosiden din."
      >
        <InviteLinkPanel hostSellerId={hostSellerId} />
      </SettingsRow>

      <SettingsRow
        title="Instruktører"
        description="Instruktørene som viser kursene sine på studiosiden din."
      >
        <AffiliatesList
          affiliates={visibleAffiliates}
          loading={loadingAffiliates}
          error={affiliatesError}
          onRetry={refresh}
          onRevoke={handleRevoke}
        />
      </SettingsRow>

      {/* A studio can itself rent space elsewhere — show the guest card only when
          such a host exists (no empty state in this position). */}
      {host && (
        <SettingsRow title="Vises hos" description="Studioet der kursene dine også vises.">
          <IndividualView
            sellerId={hostSellerId}
            host={host}
            onLeft={() => onHostChange(null)}
            hideWhenEmpty
          />
        </SettingsRow>
      )}
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Individual view — where the teacher's courses are shown
// ───────────────────────────────────────────────────────────────────────────

type HostStudio = GuestHost['host'];

// Presentational: the host state is owned by StudioPage. `hideWhenEmpty` is set
// where the card sits below a studio's own instructors — there, no host means
// render nothing rather than an empty state.
function IndividualView({
  sellerId,
  host,
  onLeft,
  hideWhenEmpty,
}: {
  sellerId: string;
  host: HostStudio | null | undefined;
  onLeft: () => void;
  hideWhenEmpty?: boolean;
}) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const handleLeave = async () => {
    if (!host) return;
    setLeaving(true);
    const { error } = await revokeAffiliation({ hostSellerId: host.id, guestSellerId: sellerId });
    setLeaving(false);
    setConfirmLeave(false);
    if (error) {
      toast.error(friendlyError(error, 'Kunne ikke stoppe visning'));
      return;
    }
    toast.success('Kursene dine vises ikke lenger på studioet');
    onLeft();
  };

  const hostUrl = host ? `${window.location.origin}/${host.slug}` : null;

  if (hideWhenEmpty && host == null) return null;

  return (
    <>
      {host === undefined ? (
        <ConnectionSkeleton />
      ) : host === null ? (
        // Unaffiliated solo seller — the tab stays visible, so explain how
        // affiliation starts (the studio shares an invite link; there is no
        // way to initiate from this side).
        <EmptyState
          variant="compact"
          title="Ikke tilknyttet et studio ennå"
          description="Får du en invitasjonslenke fra et studio, kan du vise kursene dine på studiosiden deres."
        />
      ) : (
        <Card>
          <CardContent>
            <h3 className="text-base font-medium text-foreground">
              Kursene dine vises på {host.name}
            </h3>
            <p className="mt-1 max-w-2xl text-base text-foreground-muted">
              Alle publiserte kurs vises automatisk – utkast og avsluttede kurs
              vises ikke.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="destructive" onClick={() => setConfirmLeave(true)}>
                Stopp visning
              </Button>
              {hostUrl && (
                <Button variant="outline" asChild>
                  <a href={hostUrl} target="_blank" rel="noopener noreferrer">
                    Vis studiosiden
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {host && (
        <ConfirmDialog
          open={confirmLeave}
          onOpenChange={setConfirmLeave}
          title="Stopp visning"
          body={<>Kursene dine fjernes fra siden til <strong>{host.name}</strong>.</>}
          actionLabel="Stopp visning"
          destructive
          onConfirm={handleLeave}
          loading={leaving}
          loadingText="Stopper"
        />
      )}
    </>
  );
}

function ConnectionSkeleton() {
  return (
    <div className="rounded-xl bg-panel p-6" role="status" aria-live="polite">
      <span className="sr-only">Laster samarbeid</span>
      <Skeleton className="h-5 w-64 max-w-full" />
      <Skeleton className="mt-2 h-5 w-80 max-w-full" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-9 w-32 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Instructor list primitive — studio side only
// ───────────────────────────────────────────────────────────────────────────

export function AffiliatesList({
  affiliates,
  loading,
  error,
  onRetry,
  onRevoke,
}: {
  affiliates: HostAffiliate[] | null;
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  onRevoke: (affiliate: HostAffiliate) => void;
}) {
  if (error) {
    return (
      <ErrorState
        title="Kunne ikke hente instruktørene"
        message="Sjekk forbindelsen og prøv igjen."
        onRetry={onRetry}
      />
    );
  }

  if (loading || affiliates === null) {
    return <AffiliatesListSkeleton />;
  }

  if (affiliates.length === 0) {
    return (
      <EmptyState
        variant="compact"
        title="Ingen instruktører tilknyttet ennå"
        description="Send invitasjonslenken til en instruktør for å vise kursene deres her."
      />
    );
  }

  return (
    <ul className="divide-y divide-border-subtle">
      {affiliates.map((affiliate) => (
        <li
          key={affiliate.guest_seller_id}
          className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-4"
        >
          <div className="flex min-w-0 items-center gap-3">
            <InstructorAvatar name={affiliate.guest.name} url={affiliate.guest.logo_url} />
            <p className="min-w-0 truncate text-base font-medium text-foreground">
              {affiliate.guest.name}
            </p>
          </div>
          <InstructorActionsMenu onRevoke={() => onRevoke(affiliate)} />
        </li>
      ))}
    </ul>
  );
}

function InstructorAvatar({ name, url }: { name: string; url: string | null }) {
  return <UserAvatar name={name} src={url} size="lg" />;
}

function InstructorActionsMenu({
  onRevoke,
}: {
  onRevoke: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="soft" size="icon" aria-label="Handlinger">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem variant="destructive" onClick={onRevoke}>
          Fjern fra studiosiden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Invite link panel — copy is the primary action; regenerate invalidates
// ───────────────────────────────────────────────────────────────────────────

function InviteLinkPanel({ hostSellerId }: { hostSellerId: string }) {
  const [link, setLink] = useState<SellerInviteLink | null | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  // A failed READ must not fall through to auto-generate — that would revoke
  // the (possibly still live) existing link. Track the read failure separately
  // so the panel offers a re-read, not a regenerate.
  const [fetchFailed, setFetchFailed] = useState(false);
  const autoGenAttempted = useRef(false);

  const loadLink = useCallback(async () => {
    setFetchFailed(false);
    setLink(undefined);
    const { data, error } = await fetchActiveInviteLink(hostSellerId);
    if (error) {
      setFetchFailed(true);
      setLink(null);
      return;
    }
    if (data) {
      setLink(data);
      return;
    }
    // Genuinely no active link — lazily generate one so the panel is useful.
    if (autoGenAttempted.current) {
      setLink(null);
      return;
    }
    autoGenAttempted.current = true;
    const { data: created, error: createError } = await createInviteLink(hostSellerId);
    if (createError || !created) {
      setLink(null);
      return;
    }
    setLink(created);
  }, [hostSellerId]);

  useEffect(() => {
    void loadLink();
  }, [loadLink]);

  const handleRegenerate = async () => {
    setCreating(true);
    const { data, error } = await createInviteLink(hostSellerId);
    setCreating(false);
    if (error || !data) {
      toast.error(friendlyError(error, 'Kunne ikke lage lenke'));
      return;
    }
    setLink(data);
    toast.success('Ny lenke laget');
  };

  if (link === undefined) {
    return (
      <div>
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="mt-3 h-5 w-24" />
      </div>
    );
  }

  if (!link) {
    return (
      <div>
        <p className="mb-3 text-base text-foreground-muted">
          {fetchFailed
            ? 'Kunne ikke hente invitasjonslenken.'
            : 'Kunne ikke lage invitasjonslenke.'}
        </p>
        <Button
          type="button"
          variant="default"
          disabled={creating}
          onClick={() => (fetchFailed ? void loadLink() : void handleRegenerate())}
        >
          {creating ? 'Prøver igjen' : 'Prøv igjen'}
        </Button>
      </div>
    );
  }

  return (
    <InviteLinkView
      code={link.code}
      onRegenerate={() => void handleRegenerate()}
      regenerating={creating}
    />
  );
}

/** Presentational "link is ready" state of InviteLinkPanel, split out so
 *  /dev/studio-preview can render the studio branch with a mock code — the
 *  panel itself fetches and lazily creates a link on mount, which a preview
 *  must not do against the shared database. */
export function InviteLinkView({
  code,
  onRegenerate,
  regenerating,
}: {
  code: string;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const fullUrl = `${window.location.host}/join/${code}`;
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input
          readOnly
          value={fullUrl}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Invitasjonslenke"
        />
        <CopyButton
          value={`${window.location.origin}/join/${code}`}
          label="Kopier lenke"
        />
      </div>
      <p className="mt-3 text-sm text-foreground-muted">
        Lenken er gyldig i 30 dager. Lager du en ny, slutter den gamle å virke.
      </p>
      <Button
        type="button"
        variant="link"
        loading={regenerating}
        loadingText="Lager"
        onClick={onRegenerate}
        className="mt-2 px-0"
      >
        Lag ny lenke
      </Button>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Misc
// ───────────────────────────────────────────────────────────────────────────

function AffiliatesListSkeleton() {
  return (
    <ul
      className="divide-y divide-border-subtle"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Laster…</span>
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          className="grid items-center gap-3 px-4 py-4 grid-cols-[1fr_auto]"
          aria-hidden="true"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="size-11 rounded-full" />
        </li>
      ))}
    </ul>
  );
}
