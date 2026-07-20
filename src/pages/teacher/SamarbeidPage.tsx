import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MoreVertical, Plus } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ErrorState } from '@/components/ui/error-state';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { PageShell } from '@/components/teacher/PageShell';
import { useAuth } from '@/contexts/AuthContext';
import { MONTHS_LONG } from '@/lib/calendar-nb';
import { friendlyError } from '@/lib/error-messages';
import { extractEdgeError } from '@/lib/edge-errors';
import { runWithUndo } from '@/lib/undo';
import {
  fetchGuestHost,
  fetchHostAffiliates,
  revokeAffiliation,
  type GuestHost,
  type HostAffiliate,
} from '@/services/affiliations';
import {
  acceptInvitation,
  declineInvitation,
  fetchHostInvitations,
  fetchMyInvitation,
  resendInstructorInvite,
  revokeInvitation,
  sendInstructorInvite,
  type ReceivedInvitation,
  type SellerInvitation,
} from '@/services/invitations';
import type { Seller } from '@/types/database';

// ---------------------------------------------------------------------------
// /samarbeid — collaboration as its own page, both account types.
//
// Studio (host): Navn/Rolle table — the studio itself as the Eier row, then
// active instructors and pending email invitations in one list. «Inviter» in
// the page header opens the email dialog (send-instructor-invite).
//
// Solo (guest): state-bearing section headings — a received invitation
// (Godta/Avslå), the active connection («Kursene dine vises hos …»), or the
// not-affiliated empty state. Only solo accounts can accept (enforced in the
// accept RPC); studio-as-guest is retired.
//
// Joining from an invite email lands here after accept; /studio#samarbeid
// redirects here for old links.
// ---------------------------------------------------------------------------

/** "12. juli 2026" — section meta lines. */
function formatDateNb(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}. ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

const SamarbeidPage = () => {
  const { currentSeller, currentSellerHydrateFailed, refreshSellers } = useAuth();

  if (!currentSeller) {
    return (
      <PageShell title="Samarbeid">
        <p className="text-base text-foreground-muted">
          Vi fant ikke studioet ditt. Logg ut og inn igjen, eller kontakt brukerstøtte hvis
          problemet fortsetter.
        </p>
      </PageShell>
    );
  }

  // operating_model is a stale safe-default when the hydrate failed — don't
  // guess which branch to render.
  if (currentSellerHydrateFailed) {
    return (
      <PageShell title="Samarbeid">
        <ErrorState
          title="Kunne ikke hente kontoinformasjon"
          message="Prøv igjen om litt."
          onRetry={() => void refreshSellers()}
        />
      </PageShell>
    );
  }

  return currentSeller.operating_model === 'studio' ? (
    <HostPage seller={currentSeller} />
  ) : (
    <GuestPage seller={currentSeller} />
  );
};

// ───────────────────────────────────────────────────────────────────────────
// Host (studio) — invite + one table of people
// ───────────────────────────────────────────────────────────────────────────

function HostPage({ seller }: { seller: Seller }) {
  const [affiliates, setAffiliates] = useState<HostAffiliate[] | null>(null);
  const [invitations, setInvitations] = useState<SellerInvitation[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [inviteOpen, setInviteOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [a, i] = await Promise.all([
      fetchHostAffiliates(seller.id),
      fetchHostInvitations(seller.id),
    ]);
    // A failed fetch must not read as "no instructors yet".
    if (a.error || i.error) {
      setLoadError(true);
      setAffiliates(null);
      setInvitations(null);
      return;
    }
    setLoadError(false);
    setAffiliates(a.data);
    setInvitations(i.data);
  }, [seller.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleRevokeAffiliate = (affiliate: HostAffiliate) => {
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
        const { error } = await revokeAffiliation({
          hostSellerId: seller.id,
          guestSellerId: affiliate.guest_seller_id,
        });
        if (!error) await refresh();
        return { error };
      },
      errorOf: (r) => r.error,
      errorMessage: 'Kunne ikke fjerne instruktør',
    });
  };

  const handleResend = async (invitation: SellerInvitation) => {
    const { error } = await resendInstructorInvite(invitation.id);
    if (error) {
      toast.error(friendlyError(error, 'Kunne ikke sende e-posten'));
      return;
    }
    toast.success('Invitasjonen er sendt på nytt');
  };

  const handleRevokeInvitation = async (invitation: SellerInvitation) => {
    const { error } = await revokeInvitation(invitation.id);
    if (error) {
      toast.error(friendlyError(error, 'Kunne ikke fjerne invitasjonen'));
      return;
    }
    toast.success('Invitasjonen er fjernet');
    await refresh();
  };

  const visibleAffiliates =
    affiliates?.filter((a) => !hiddenIds.has(a.guest_seller_id)) ?? null;

  return (
    <PageShell
      title="Samarbeid"
      description="Inviter instruktører til å vise kursene sine på studiosiden din."
      action={
        <Button onClick={() => setInviteOpen(true)}>
          <Plus data-icon="inline-start" />
          Inviter
        </Button>
      }
    >
      <h2 className="mb-3 text-base font-medium text-foreground">Instruktører</h2>
      {loadError ? (
        <ErrorState
          title="Kunne ikke hente instruktørene"
          message="Sjekk forbindelsen og prøv igjen."
          onRetry={() => void refresh()}
        />
      ) : (
        <InstructorTable
          ownerName={seller.name}
          ownerLogoUrl={seller.logo_url}
          affiliates={visibleAffiliates}
          invitations={invitations}
          onRevokeAffiliate={handleRevokeAffiliate}
          onResendInvitation={(inv) => void handleResend(inv)}
          onRevokeInvitation={(inv) => void handleRevokeInvitation(inv)}
        />
      )}

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        sellerId={seller.id}
        onSent={() => void refresh()}
      />
    </PageShell>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// The Navn/Rolle table — presentational, previewable on /dev
// ───────────────────────────────────────────────────────────────────────────

export function InstructorTable({
  ownerName,
  ownerLogoUrl,
  affiliates,
  invitations,
  onRevokeAffiliate,
  onResendInvitation,
  onRevokeInvitation,
}: {
  ownerName: string;
  ownerLogoUrl: string | null;
  /** null = loading */
  affiliates: HostAffiliate[] | null;
  /** null = loading */
  invitations: SellerInvitation[] | null;
  onRevokeAffiliate: (affiliate: HostAffiliate) => void;
  onResendInvitation: (invitation: SellerInvitation) => void;
  onRevokeInvitation: (invitation: SellerInvitation) => void;
}) {
  const loading = affiliates === null || invitations === null;
  const empty = !loading && affiliates.length === 0 && invitations.length === 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle">
      {/* Header band: lightest neutral fill, full-ink labels (filled containers
          never carry muted text). Navn aligns with the avatar column. */}
      <div className="flex items-center gap-3 border-b border-border-subtle bg-panel px-4 py-2.5">
        <span className="min-w-0 flex-1 text-xs font-medium text-foreground">Navn</span>
        <span className="w-[110px] flex-none text-xs font-medium text-foreground">Rolle</span>
        <span className="w-9 flex-none" aria-hidden="true" />
      </div>

      <div className="divide-y divide-border-subtle">
        {/* The team IS the studio — the owner row makes that visible. */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <UserAvatar name={ownerName} src={ownerLogoUrl} size="lg" />
          <p className="min-w-0 flex-1 truncate text-base font-medium text-foreground">
            {ownerName}
          </p>
          <span className="w-[110px] flex-none text-sm text-foreground">Eier</span>
          <span className="w-9 flex-none" aria-hidden="true" />
        </div>

        {loading ? (
          <InstructorRowsSkeleton />
        ) : (
          <>
            {affiliates.map((affiliate) => (
              <div key={affiliate.guest_seller_id} className="flex items-center gap-3 px-4 py-3.5">
                <UserAvatar
                  name={affiliate.guest.name}
                  src={affiliate.guest.logo_url}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium text-foreground">
                    {affiliate.guest.name}
                  </p>
                  <p className="text-sm text-foreground-muted">
                    Ble med {formatDateNb(affiliate.created_at)}
                  </p>
                </div>
                <span className="w-[110px] flex-none text-sm text-foreground">Instruktør</span>
                <RowMenu>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onRevokeAffiliate(affiliate)}
                  >
                    Fjern fra studiosiden
                  </DropdownMenuItem>
                </RowMenu>
              </div>
            ))}

            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center gap-3 px-4 py-3.5">
                <UserAvatar name={invitation.email} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base text-foreground">{invitation.email}</p>
                  <p className="text-sm text-foreground-muted">
                    Invitert {formatDateNb(invitation.created_at)}
                  </p>
                </div>
                <span className="w-[110px] flex-none text-sm text-foreground">Instruktør</span>
                <RowMenu>
                  <DropdownMenuItem onClick={() => onResendInvitation(invitation)}>
                    Send på nytt
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onRevokeInvitation(invitation)}
                  >
                    Fjern
                  </DropdownMenuItem>
                </RowMenu>
              </div>
            ))}

            {empty && (
              // Empty state as a quiet table row — the structure stays intact.
              <div className="px-4 py-4 text-sm text-foreground-muted">
                Ingen instruktører ennå.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RowMenu({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="soft" size="icon" aria-label="Handlinger" className="flex-none">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}

function InstructorRowsSkeleton() {
  return (
    <div role="status" aria-live="polite" className="divide-y divide-border-subtle">
      <span className="sr-only">Laster…</span>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5" aria-hidden="true">
          <Skeleton className="size-10 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-28" />
          </div>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="size-9 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Invite dialog — one field, footer buttons stretched (ConfirmDialog anatomy)
// ───────────────────────────────────────────────────────────────────────────

function InviteDialog({
  open,
  onOpenChange,
  sellerId,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellerId: string;
  onSent: () => void;
}) {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (sending) return;
    onOpenChange(next);
    if (!next) {
      setEmail('');
      setFieldError(null);
    }
  };

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setFieldError('Skriv inn en gyldig e-postadresse.');
      return;
    }
    setSending(true);
    const { error } = await sendInstructorInvite(sellerId, trimmed);
    setSending(false);
    if (error) {
      const { message } = await extractEdgeError(error);
      if (message === 'invalid_email') {
        setFieldError('Skriv inn en gyldig e-postadresse.');
        return;
      }
      if (message === 'email_failed') {
        // The row exists — the pending row's «Send på nytt» is the recovery.
        toast.error('Invitasjonen ble laget, men e-posten feilet. Send på nytt fra listen.');
        onSent();
        handleOpenChange(false);
        return;
      }
      toast.error('Kunne ikke sende invitasjonen');
      return;
    }
    toast.success('Invitasjon sendt');
    onSent();
    onOpenChange(false);
    setEmail('');
    setFieldError(null);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Inviter instruktør</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="invite-email">E-post</Label>
          <Input
            id="invite-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="navn@eksempel.no"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldError) setFieldError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSend();
              }
            }}
            disabled={sending}
            aria-invalid={!!fieldError || undefined}
            aria-describedby={fieldError ? 'invite-email-error' : undefined}
          />
          {fieldError && <FieldError id="invite-email-error">{fieldError}</FieldError>}
        </div>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <Button variant="secondary" size="lg" disabled={sending}>
              Avbryt
            </Button>
          </ResponsiveDialogClose>
          <Button size="lg" onClick={() => void handleSend()} loading={sending} loadingText="Sender">
            Send invitasjon
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Guest (solo) — the heading carries the state
// ───────────────────────────────────────────────────────────────────────────

function GuestPage({ seller }: { seller: Seller }) {
  // undefined = loading, 'error' = fetch failed.
  const [host, setHost] = useState<GuestHost | null | undefined | 'error'>(undefined);
  const [invitation, setInvitation] = useState<ReceivedInvitation | null | undefined | 'error'>(
    undefined,
  );

  const refresh = useCallback(async () => {
    const [h, i] = await Promise.all([fetchGuestHost(seller.id), fetchMyInvitation()]);
    setHost(h.error ? 'error' : h.data);
    setInvitation(i.error ? 'error' : i.data);
  }, [seller.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loading = host === undefined || invitation === undefined;
  const failed = host === 'error' || invitation === 'error';
  const activeHost = host !== 'error' ? host : null;
  const pendingInvitation = invitation !== 'error' ? invitation : null;

  return (
    <PageShell title="Samarbeid">
      {loading ? (
        <GuestSkeleton />
      ) : failed ? (
        <ErrorState title="Kunne ikke hente info" message="" onRetry={() => void refresh()} />
      ) : (
        <div className="max-w-xl space-y-10">
          {pendingInvitation && (
            <GuestInvitationSection
              invitation={pendingInvitation}
              onChanged={() => void refresh()}
            />
          )}
          {activeHost ? (
            <GuestConnectedSection
              sellerId={seller.id}
              host={activeHost}
              onLeft={() => void refresh()}
            />
          ) : (
            !pendingInvitation && <GuestEmptySection />
          )}
        </div>
      )}
    </PageShell>
  );
}

/** Section heading + one-line description — the heading does the explaining. */
function GuestSectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-medium text-foreground">{title}</h2>
      <p className="mt-0.5 text-sm text-foreground-muted">{description}</p>
    </div>
  );
}

export function GuestConnectedSection({
  sellerId,
  host,
  onLeft,
}: {
  sellerId: string;
  host: GuestHost;
  onLeft: () => void;
}) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const handleLeave = async () => {
    setLeaving(true);
    const { error } = await revokeAffiliation({
      hostSellerId: host.host.id,
      guestSellerId: sellerId,
    });
    setLeaving(false);
    setConfirmLeave(false);
    if (error) {
      toast.error(friendlyError(error, 'Kunne ikke stoppe visning'));
      return;
    }
    toast.success('Kursene dine vises ikke lenger på studioet');
    onLeft();
  };

  return (
    <section>
      <GuestSectionHeading
        title={`Kursene dine vises hos ${host.host.name}`}
        description="Publiserte kurs vises automatisk på studiosiden deres."
      />
      <div className="overflow-hidden rounded-2xl border border-border-subtle">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <UserAvatar name={host.host.name} src={host.host.logo_url} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-medium text-foreground">{host.host.name}</p>
            <p className="text-sm text-foreground-muted">
              <span
                className="mr-1.5 inline-block size-1.5 rounded-full bg-success-bright align-[1px]"
                aria-hidden="true"
              />
              Tilknyttet siden {formatDateNb(host.created_at)}
            </p>
          </div>
          <RowMenu>
            <DropdownMenuItem
              onClick={() => window.open(`/${host.host.slug}`, '_blank', 'noopener')}
            >
              Se studiosiden
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmLeave(true)}>
              Stopp visning
            </DropdownMenuItem>
          </RowMenu>
        </div>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Stopp visning"
        body={
          <>
            Kursene dine fjernes fra siden til <strong>{host.host.name}</strong>.
          </>
        }
        actionLabel="Stopp visning"
        destructive
        onConfirm={() => void handleLeave()}
        loading={leaving}
        loadingText="Stopper"
      />
    </section>
  );
}

export function GuestInvitationSection({
  invitation,
  onChanged,
}: {
  invitation: ReceivedInvitation;
  onChanged: () => void;
}) {
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [forceLeave, setForceLeave] = useState<{ existingName: string | null } | null>(null);

  const hostName = invitation.host?.name ?? 'Studioet';

  const handleAccept = async (force = false) => {
    setAccepting(true);
    const { data, error } = await acceptInvitation(invitation.token, force);
    setAccepting(false);
    if (error || !data) {
      toast.error(friendlyError(error, 'Kunne ikke godta invitasjonen'));
      return;
    }
    switch (data.status) {
      case 'joined':
      case 'already_affiliated':
        setForceLeave(null);
        toast.success(`Kursene dine vises nå hos ${hostName}`);
        onChanged();
        return;
      case 'has_other_host':
        setForceLeave({ existingName: null });
        return;
      case 'expired':
        toast.error('Invitasjonen er utløpt');
        onChanged();
        return;
      default:
        toast.error('Kunne ikke godta invitasjonen');
        onChanged();
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    const { error } = await declineInvitation(invitation.token);
    setDeclining(false);
    if (error) {
      toast.error(friendlyError(error, 'Kunne ikke avslå invitasjonen'));
      return;
    }
    toast.success('Invitasjonen er avslått');
    onChanged();
  };

  return (
    <section>
      <GuestSectionHeading
        title={`${hostName} har invitert deg`}
        description="Godtar du, vises kursene dine på studiosiden deres."
      />
      <div className="overflow-hidden rounded-2xl border border-border-subtle">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
          <UserAvatar name={hostName} src={invitation.host?.logo_url ?? null} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-medium text-foreground">{hostName}</p>
            <p className="text-sm text-foreground-muted">
              Invitert {formatDateNb(invitation.created_at)}
            </p>
          </div>
          <div className="flex flex-none gap-2">
            <Button
              variant="secondary"
              onClick={() => void handleDecline()}
              loading={declining}
              loadingText="Avslår"
              disabled={accepting}
            >
              Avslå
            </Button>
            <Button
              onClick={() => void handleAccept(false)}
              loading={accepting && !forceLeave}
              loadingText="Godtar"
              disabled={declining}
            >
              Godta
            </Button>
          </div>
        </div>
      </div>

      {/* Single-host constraint: accepting while affiliated elsewhere needs an
          explicit leave-and-switch confirmation. */}
      <ConfirmDialog
        open={forceLeave !== null}
        onOpenChange={(open) => {
          if (!open && !accepting) setForceLeave(null);
        }}
        title={`Bli med hos ${hostName}`}
        body={<>Du kan være med i ett studio om gangen. Blir du med her, forlater du det forrige studioet.</>}
        actionLabel="Forlat og bli med"
        onConfirm={() => void handleAccept(true)}
        loading={accepting}
        loadingText="Blir med"
      />
    </section>
  );
}

export function GuestEmptySection() {
  return (
    <section>
      <GuestSectionHeading
        title="Ikke tilknyttet et studio"
        description="Blir du invitert av et studio, vises kursene dine på studiosiden deres."
      />
      <div className="overflow-hidden rounded-2xl border border-border-subtle">
        <div className="px-4 py-4 text-sm text-foreground-muted">Ingen invitasjoner ennå.</div>
      </div>
    </section>
  );
}

function GuestSkeleton() {
  return (
    <div role="status" aria-live="polite" className="max-w-xl">
      <span className="sr-only">Laster…</span>
      <Skeleton className="h-5 w-64 max-w-full" />
      <Skeleton className="mt-1.5 h-4 w-80 max-w-full" />
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border-subtle px-4 py-3.5">
        <Skeleton className="size-10 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3.5 w-28" />
        </div>
        <Skeleton className="size-9 rounded-full" />
      </div>
    </div>
  );
}

export default SamarbeidPage;
