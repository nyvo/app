import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, ExternalLink, ImageIcon, MoreVertical, UserPlus } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
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
// Studio-page display UI — split by seller type.
//
// Business / studio (owner side):
//   - Invite link.
//   - Instructors whose courses show on this studio page.
//
// Individual teacher (member side):
//   - The studio page their courses show on.
//   - "Stopp visning" action.
//
// Empty state for individuals: courses are not shown on a studio page.
// ---------------------------------------------------------------------------

export function AffiliationsSection() {
  const { currentSeller, currentTeam } = useAuth();
  const isBusiness = currentSeller?.seller_type === 'business';

  if (!currentSeller) return null;

  if (isBusiness) {
    if (!currentTeam) return null;
    return <BusinessView teamId={currentTeam.id} />;
  }

  return <IndividualView sellerId={currentSeller.id} />;
}

// ───────────────────────────────────────────────────────────────────────────
// Business view — invite link + connected instructors
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
    <section className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Instruktører</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Legg til instruktører hvis kurs skal vises på studiosiden din.
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <div className="mb-3">
            <h3 className="text-sm font-medium text-foreground">Invitasjonslenke</h3>
            <p className="mt-1 text-sm text-foreground-muted">
              Send denne til instruktøren.
            </p>
          </div>
          <InviteLinkPanel teamId={teamId} />
        </section>

        <section className="border-t border-border pt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-foreground">Instruktører på studiosiden</h3>
            {visibleAffiliates === null ? (
              <Skeleton className="h-5 w-16" aria-hidden="true" />
            ) : (
              <span className="text-sm text-foreground-muted">
                {formatInstructorCount(visibleAffiliates.length)}
              </span>
            )}
          </div>
          <AffiliatesList
            affiliates={visibleAffiliates}
            loading={loadingAffiliates}
            onRevoke={handleRevoke}
          />
        </section>
      </div>
    </section>
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
      toast.error(friendlyError(error, 'Kunne ikke stoppe visning.'));
      return;
    }
    toast.success('Kursene dine vises ikke lenger på studioet');
    setHost(null);
  };

  const hostUrl = host ? `${window.location.origin}/${host.slug}` : null;
  const hostDisplayUrl = host ? `${window.location.host}/${host.slug}` : null;

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Studioside</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Her ser du om kursene dine vises på en studioside.
          </p>
        </div>
        {host && hostUrl && (
          <div className="shrink-0">
            <Button asChild variant="secondary" size="sm">
              <a href={hostUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink data-icon="inline-start" />
                Vis studiosiden
              </a>
            </Button>
          </div>
        )}
      </div>

      {host === undefined ? (
        <div className="rounded-md border border-border bg-surface p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-md" />
            <div className="min-w-0 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
            <Skeleton className="ml-auto h-5 w-14 rounded-full" />
          </div>
        </div>
      ) : host === null ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center">
          <p className="text-base font-medium text-foreground">Kursene dine vises ikke på en studioside</p>
          <p className="text-base text-foreground-muted mt-1 max-w-xs mx-auto">
            Åpne en invitasjonslenke fra et studio for å vise kursene dine der.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-md border border-border bg-surface">
            <div className="flex items-center gap-3 p-4">
              <HostCover url={host.cover_image_url} />
              <div className="min-w-0">
                <p className="text-base font-medium text-foreground truncate">{host.name}</p>
                <p className="text-sm text-foreground-muted truncate">{hostDisplayUrl}</p>
              </div>
            </div>
            <div className="border-t border-border px-4 py-3">
              <p className="text-sm text-foreground-muted">
                Alle aktive kurs vises på denne studiosiden.
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <Button
              variant="plain"
              className="text-danger hover:text-danger"
              onClick={() => setConfirmLeave(true)}
            >
              Stopp visning
            </Button>
          </div>

          <ConfirmDialog
            open={confirmLeave}
            onOpenChange={setConfirmLeave}
            ariaLabel="Stopp visning"
            headline={`Stopp visning på ${host.name}?`}
            actionLabel="Stopp visning"
            onConfirm={handleLeave}
            loading={leaving}
            loadingText="Stopper"
          >
            <p className="text-base text-foreground-muted">
              Kursene dine fjernes fra studiosiden. Du kan koble deg til igjen med en ny invitasjonslenke.
            </p>
          </ConfirmDialog>
        </div>
      )}
    </section>
  );
}

function HostCover({ url }: { url: string | null }) {
  if (url) {
    return (
      <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
        <img src={url} alt="" className="size-full object-cover" />
      </div>
    );
  }
  return (
    <div className="size-10 shrink-0 rounded-md bg-muted flex items-center justify-center">
      <ImageIcon className="size-5 text-foreground-muted" aria-hidden="true" />
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
      <div className="rounded-md border border-dashed border-border p-6 text-center">
        <UserPlus className="mx-auto mb-3 size-5 text-foreground-muted" aria-hidden="true" />
        <p className="text-base font-medium text-foreground">Ingen instruktører tilknyttet ennå</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-foreground-muted">
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
            <div className="min-w-0">
              <p className="text-base font-medium text-foreground truncate">{affiliate.seller.name}</p>
              <p className="text-sm text-foreground-muted truncate">
                Kurs vises på studiosiden
              </p>
            </div>
          </div>
          <InstructorActionsMenu onRevoke={() => onRevoke(affiliate)} />
        </li>
      ))}
    </ul>
  );
}

function InstructorAvatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <div className="size-10 shrink-0 overflow-hidden rounded-full bg-muted">
        <img src={url} alt="" className="size-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
      {initialsForName(name)}
    </div>
  );
}

function formatInstructorCount(count: number) {
  return count === 1 ? '1 instruktør' : `${count} instruktører`;
}

function initialsForName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function InstructorActionsMenu({
  onRevoke,
}: {
  onRevoke: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Handlinger">
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
// Invite link panel — replaces the old email invite form
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
    toast.success('Ny lenke laget');
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
    return <div className="h-9 rounded-md border border-border bg-muted" />;
  }

  if (!link) {
    return (
      <div>
        <p className="text-base text-foreground-muted mb-2">
          Kunne ikke opprette invitasjonslenke.
        </p>
        <button
          type="button"
          className="text-base text-foreground underline-offset-4 hover:underline disabled:opacity-50"
          disabled={creating}
          onClick={() => void handleRegenerate()}
        >
          {creating ? 'Prøver igjen…' : 'Prøv på nytt'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <input
          readOnly
          value={fullUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="h-9 w-full rounded-md border border-border bg-surface pl-3 pr-10 text-base text-foreground outline-none focus:border-foreground"
          aria-label="Invitasjonslenke"
        />
        <button
          type="button"
          onClick={() => void handleCopy()}
          aria-label="Kopier lenke"
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-foreground-muted hover:text-foreground"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>
      <button
        type="button"
        className="mt-2 text-sm text-foreground-muted underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
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
