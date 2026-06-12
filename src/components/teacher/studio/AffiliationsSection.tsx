import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { MoreVertical } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { SettingsSection } from '@/components/teacher/SettingsSection';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { runWithUndo } from '@/lib/undo';
import { friendlyError } from '@/lib/error-messages';
import { cn } from '@/lib/utils';
import {
  fetchTeamAffiliates,
  revokeAffiliation,
  type OutgoingAffiliate,
} from '@/services/affiliations';
import {
  fetchActiveInviteLink,
  createInviteLink,
} from '@/services/invite-links';
import { supabase } from '@/lib/supabase';
import type { TeamInviteLink } from '@/types/database';

// ---------------------------------------------------------------------------
// Samarbeid — lives as a section on the Studio page (it's storefront
// management: what shows on which page). Split by seller type:
//
// Business / studio (owner side):
//   - Invite link panel ("Inviter en instruktør").
//   - Instructors whose courses show on this studio page.
//
// Individual teacher (member side):
//   - The studio page their courses show on.
//   - "Stopp visning" action.
//
// Joining via /join/:code lands here at /studio#samarbeid — the section
// scrolls itself into view so the join flow ends with visible confirmation.
// ---------------------------------------------------------------------------

export function AffiliationsSection() {
  const { currentSeller, currentTeam } = useAuth();
  const { hash } = useLocation();
  const anchorRef = useRef<HTMLDivElement>(null);
  const isBusiness = currentSeller?.seller_type === 'business';

  useEffect(() => {
    if (hash === '#samarbeid') {
      anchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hash]);

  if (!currentSeller) return null;
  if (isBusiness && !currentTeam) return null;

  return (
    <div ref={anchorRef} id="samarbeid" className="scroll-mt-10">
      {isBusiness && currentTeam ? (
        <SettingsSection
          title="Samarbeid"
          description="Inviter instruktører til å vise kursene sine på studiosiden din."
        >
          <BusinessView teamId={currentTeam.id} />
        </SettingsSection>
      ) : (
        <SettingsSection
          title="Samarbeid"
          description="Vis kursene dine på et studios side."
        >
          <IndividualView sellerId={currentSeller.id} />
        </SettingsSection>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Business view — invite card + connected instructors
// ───────────────────────────────────────────────────────────────────────────

function BusinessView({ teamId }: { teamId: string }) {
  const [affiliates, setAffiliates] = useState<OutgoingAffiliate[] | null>(null);
  const [loadingAffiliates, setLoadingAffiliates] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());

  const refresh = useCallback(async () => {
    setLoadingAffiliates(true);
    const { data } = await fetchTeamAffiliates(teamId);
    setAffiliates(data);
    setLoadingAffiliates(false);
  }, [teamId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleRevoke = (affiliate: OutgoingAffiliate) => {
    runWithUndo({
      message: `${affiliate.seller.name} vises ikke lenger på studiosiden`,
      hide: () => setHiddenIds((prev) => new Set(prev).add(affiliate.seller_id)),
      restore: () =>
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(affiliate.seller_id);
          return next;
        }),
      commit: async () => {
        const { error } = await revokeAffiliation({ teamId, sellerId: affiliate.seller_id });
        if (!error) await refresh();
        return { error };
      },
      errorOf: (r) => r.error,
      errorMessage: 'Kunne ikke fjerne instruktør',
    });
  };

  const visibleAffiliates =
    affiliates?.filter((affiliate) =>
      affiliate.status === 'active' && !hiddenIds.has(affiliate.seller_id)
    ) ?? null;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <h3 className="text-base font-medium tracking-tight text-foreground">
            Inviter en instruktør
          </h3>
          <p className="mt-1 max-w-2xl text-base text-foreground-muted">
            Del lenken på SMS eller Messenger. Den kan brukes av flere
            instruktører, og alle publiserte kurs vises automatisk på
            studiosiden.
          </p>
          <div className="mt-4">
            <InviteLinkPanel teamId={teamId} />
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-foreground">Instruktører</p>
          {visibleAffiliates === null ? (
            <Skeleton className="h-6 w-20 rounded-full" aria-hidden="true" />
          ) : visibleAffiliates.length > 0 ? (
            <Badge variant="neutral" shape="pill" size="md">
              {formatInstructorCount(visibleAffiliates.length)}
            </Badge>
          ) : null}
        </div>
        <AffiliatesList
          affiliates={visibleAffiliates}
          loading={loadingAffiliates}
          onRevoke={handleRevoke}
        />
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Individual view — where the teacher's courses are shown
// ───────────────────────────────────────────────────────────────────────────

interface HostTeam {
  id: string;
  slug: string;
  name: string;
  cover_image_url: string | null;
}

function IndividualView({ sellerId }: { sellerId: string }) {
  const [host, setHost] = useState<HostTeam | null | undefined>(undefined);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const loadHost = useCallback(async () => {
    // The teacher's active studio connection. With single-team enforcement,
    // this is at most one.
    const { data, error } = await supabase
      .from('team_affiliations')
      .select('team_id, team:teams!inner(id, slug, name, cover_image_url)')
      .eq('seller_id', sellerId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (error) {
      setHost(null);
      return;
    }
    const t = (data as { team: HostTeam | null } | null)?.team ?? null;
    setHost(t);
  }, [sellerId]);

  useEffect(() => { void loadHost(); }, [loadHost]);

  const handleLeave = async () => {
    if (!host) return;
    setLeaving(true);
    const { error } = await revokeAffiliation({ teamId: host.id, sellerId });
    setLeaving(false);
    setConfirmLeave(false);
    if (error) {
      toast.error(friendlyError(error, 'Kunne ikke stoppe visning'));
      return;
    }
    toast.success('Kursene dine vises ikke lenger på studioet');
    setHost(null);
  };

  const hostUrl = host ? `${window.location.origin}/${host.slug}` : null;

  return (
    <>
      {host === undefined ? (
        <ConnectionSkeleton />
      ) : host === null ? (
        <Card>
          <CardContent>
            <p className="text-base font-medium text-foreground">Ingen aktive samarbeid</p>
            <p className="mt-1 max-w-md text-base text-foreground-muted">
              Be studioet sende deg en invitasjonslenke.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <h3 className="text-base font-medium tracking-tight text-foreground">
              Kursene dine vises på {host.name}
            </h3>
            <p className="mt-1 max-w-2xl text-base text-foreground-muted">
              Alle publiserte kurs vises automatisk — utkast og avsluttede kurs
              vises ikke. Du kan stoppe visningen når som helst.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => setConfirmLeave(true)}>
                Stopp visning
              </Button>
              {hostUrl && (
                <Button asChild>
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
          ariaLabel="Stopp visning"
          title="Stopp visning"
          body={<><strong>{host.name}</strong> fjernes fra studiosiden.</>}
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
    <div className="rounded-xl border border-border bg-surface p-6" role="status" aria-live="polite">
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

function AffiliatesList({
  affiliates,
  loading,
  onRevoke,
}: {
  affiliates: OutgoingAffiliate[] | null;
  loading: boolean;
  onRevoke: (affiliate: OutgoingAffiliate) => void;
}) {
  if (loading || affiliates === null) {
    return <AffiliatesListSkeleton />;
  }

  if (affiliates.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="text-base font-medium text-foreground">Ingen instruktører tilknyttet ennå</p>
        <p className="mt-1 max-w-md text-base text-foreground-muted">
          Send invitasjonslenken til en instruktør for å vise kursene deres her.
        </p>
      </div>
    );
  }

  return (
    <ul className="rounded-md border border-border bg-surface overflow-hidden">
      {affiliates.map((affiliate, i) => (
        <li
          key={affiliate.seller_id}
          className={cn(
            'grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3',
            i > 0 && 'border-t border-border',
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <InstructorAvatar name={affiliate.seller.name} url={affiliate.seller.logo_url} />
            <p className="min-w-0 truncate text-base font-medium text-foreground">
              {affiliate.seller.name}
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

function formatInstructorCount(count: number) {
  return count === 1 ? '1 instruktør' : `${count} instruktører`;
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
        <DropdownMenuItem onClick={onRevoke}>
          Fjern fra studiosiden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Invite link panel — copy is the primary action; regenerate invalidates
// ───────────────────────────────────────────────────────────────────────────

function InviteLinkPanel({ teamId }: { teamId: string }) {
  const [link, setLink] = useState<TeamInviteLink | null | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const autoGenAttempted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await fetchActiveInviteLink(teamId);
      if (cancelled) return;
      if (data) {
        setLink(data);
        return;
      }
      // No active link — lazily generate one so the panel is useful immediately.
      if (autoGenAttempted.current) {
        setLink(null);
        return;
      }
      autoGenAttempted.current = true;
      const { data: created, error } = await createInviteLink(teamId);
      if (cancelled) return;
      if (error || !created) {
        setLink(null);
        return;
      }
      setLink(created);
    })();
    return () => { cancelled = true; };
  }, [teamId]);

  const handleRegenerate = async () => {
    setCreating(true);
    const { data, error } = await createInviteLink(teamId);
    setCreating(false);
    if (error || !data) {
      toast.error(friendlyError(error, 'Kunne ikke lage lenke.'));
      return;
    }
    setLink(data);
    toast.success('Ny lenke laget — den gamle virker ikke lenger');
  };

  const fullUrl = link ? `${window.location.host}/join/${link.code}` : '';

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${link.code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Kunne ikke kopiere – kopier manuelt.');
    }
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
          Kunne ikke lage invitasjonslenke.
        </p>
        <Button
          type="button"
          variant="secondary"
          disabled={creating}
          onClick={() => void handleRegenerate()}
        >
          {creating ? 'Prøver igjen…' : 'Prøv igjen'}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input
          readOnly
          value={fullUrl}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Invitasjonslenke"
        />
        <Button type="button" onClick={() => void handleCopy()}>
          {copied ? 'Kopiert' : 'Kopier lenke'}
        </Button>
      </div>
      <p className="mt-3 text-sm text-foreground-muted">
        Lenken er gyldig i 30 dager. Lager du en ny, slutter den gamle å virke.
      </p>
      <button
        type="button"
        className="mt-2 text-base text-foreground-muted underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
        disabled={creating}
        onClick={() => void handleRegenerate()}
      >
        {creating ? 'Lager…' : 'Lag ny lenke'}
      </button>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Misc
// ───────────────────────────────────────────────────────────────────────────

function AffiliatesListSkeleton() {
  return (
    <ul
      className="rounded-md border border-border bg-surface overflow-hidden"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Laster…</span>
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          className={cn(
            'grid items-center gap-4 px-4 py-3 grid-cols-[1fr_auto]',
            i > 0 && 'border-t border-border',
          )}
          aria-hidden="true"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="min-w-0 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </li>
      ))}
    </ul>
  );
}
