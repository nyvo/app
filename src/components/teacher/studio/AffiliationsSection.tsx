import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, ImageIcon, MoreVertical } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { fetchTeamMembers, revokeAffiliation, type TeamMember } from '@/services/affiliations';
import {
  fetchActiveInviteLink,
  createInviteLink,
} from '@/services/invite-links';
import { supabase } from '@/lib/supabase';
import type { TeamInviteLink } from '@/types/database';

// ---------------------------------------------------------------------------
// Team UI — split by seller type.
//
// Business / studio (owner side):
//   - Invite link panel: copyable link + "Lag ny lenke".
//   - Members table: Eier + Medlems with kebab to Fjern medlem.
//
// Individual teacher (member side):
//   - Active team header: cover + name + URL.
//   - Same members table read-only.
//   - "Forlat team" button below the table.
//
// Empty state for individuals: "Du har ikke et team enda."
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
// Business view — invite link + members table + manage actions
// ───────────────────────────────────────────────────────────────────────────

function BusinessView({ teamId }: { teamId: string }) {
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());

  const refresh = useCallback(async () => {
    setLoadingMembers(true);
    const { data } = await fetchTeamMembers(teamId);
    setMembers(data);
    setLoadingMembers(false);
  }, [teamId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleRevoke = (member: TeamMember) => {
    runWithUndo({
      message: `${member.name} ble fjernet fra teamet`,
      hide: () => setHiddenIds((prev) => new Set(prev).add(member.sellerId)),
      restore: () =>
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(member.sellerId);
          return next;
        }),
      commit: async () => {
        const { error } = await revokeAffiliation({ teamId, sellerId: member.sellerId });
        if (!error) await refresh();
        return { error };
      },
      errorOf: (r) => r.error,
      errorMessage: 'Kunne ikke fjerne medlem',
    });
  };

  const visibleMembers = members?.filter((m) => !hiddenIds.has(m.sellerId)) ?? null;
  const hasAffiliates = !!visibleMembers?.some((m) => m.role === 'member');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>
          Inviter andre instruktører til å vise kursene sine på studiosiden din.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <InviteLinkPanel teamId={teamId} />
          {hasAffiliates && (
            <MembersTable
              members={visibleMembers}
              loading={loadingMembers}
              kebabFor={(m) => (m.role === 'owner' ? null : (
                <MemberActionsMenu member={m} onRevoke={() => handleRevoke(m)} />
              ))}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Individual view — host team header + read-only members table + leave action
// ───────────────────────────────────────────────────────────────────────────

interface HostTeam {
  id: string;
  slug: string;
  name: string;
  cover_image_url: string | null;
}

function IndividualView({ sellerId }: { sellerId: string }) {
  const [host, setHost] = useState<HostTeam | null | undefined>(undefined);
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const loadHost = useCallback(async () => {
    // The individual's "active team" = the team they have an active
    // affiliation with. With single-team enforcement, this is at most one.
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

  const loadMembers = useCallback(async (teamId: string) => {
    setLoadingMembers(true);
    const { data } = await fetchTeamMembers(teamId);
    setMembers(data);
    setLoadingMembers(false);
  }, []);

  useEffect(() => { void loadHost(); }, [loadHost]);
  useEffect(() => {
    if (host?.id) void loadMembers(host.id);
  }, [host?.id, loadMembers]);

  const handleLeave = async () => {
    if (!host) return;
    setLeaving(true);
    const { error } = await revokeAffiliation({ teamId: host.id, sellerId });
    setLeaving(false);
    setConfirmLeave(false);
    if (error) {
      toast.error(friendlyError(error, 'Kunne ikke forlate teamet.'));
      return;
    }
    toast.success('Du har forlatt teamet');
    setHost(null);
    setMembers(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>
          Studioet du er medlem av. Alle kursene dine vises automatisk.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {host === undefined ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-md" />
              <div className="min-w-0 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
            </div>
            <MembersTableSkeleton />
          </div>
        ) : host === null ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center">
            <p className="text-sm font-medium text-foreground">Du har ikke et team ennå</p>
            <p className="text-sm text-foreground-muted mt-1 max-w-xs mx-auto">
              Be studioet om en invitasjonslenke, eller åpne lenken du har fått.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Host team header */}
            <div className="flex items-center gap-3">
              <HostCover url={host.cover_image_url} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{host.name}</p>
                <p className="text-xs text-foreground-muted truncate">
                  {window.location.host}/{host.slug}
                </p>
              </div>
            </div>

            <MembersTable members={members} loading={loadingMembers} />

            <div className="flex justify-end">
              <Button
                variant="outline-soft"
                size="sm"
                onClick={() => setConfirmLeave(true)}
              >
                Forlat team
              </Button>
            </div>

            <ConfirmDialog
              open={confirmLeave}
              onOpenChange={setConfirmLeave}
              ariaLabel="Forlat team"
              headline={`Forlat ${host.name}?`}
              actionLabel="Forlat team"
              onConfirm={handleLeave}
              loading={leaving}
              loadingText="Forlater"
            >
              <p className="text-sm text-foreground-muted">
                Kursene dine forsvinner fra studio-siden. Du kan inviteres på nytt senere.
              </p>
            </ConfirmDialog>
          </div>
        )}
      </CardContent>
    </Card>
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
// Members table primitive — reused by both views
// ───────────────────────────────────────────────────────────────────────────

function MembersTable({
  members,
  loading,
  kebabFor,
}: {
  members: TeamMember[] | null;
  loading: boolean;
  kebabFor?: (m: TeamMember) => React.ReactNode;
}) {
  if (loading || members === null) {
    return <MembersTableSkeleton />;
  }
  const hasKebab = !!kebabFor;
  const gridCols = hasKebab ? 'grid-cols-[1fr_auto_auto]' : 'grid-cols-[1fr_auto]';
  return (
    <ul className="rounded-md border border-border bg-surface overflow-hidden">
      {members.map((m, i) => (
        <li
          key={m.sellerId}
          className={cn('grid items-center gap-4 px-4 py-3', gridCols, i > 0 && 'border-t border-border')}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
            {m.email && (
              <p className="text-xs text-foreground-muted truncate">{m.email}</p>
            )}
          </div>
          {m.role === 'owner' ? (
            <Badge variant="inverted" shape="pill">Eier</Badge>
          ) : (
            <Badge variant="neutral" shape="pill">Medlem</Badge>
          )}
          {hasKebab && (kebabFor!(m) ?? <span className="w-9" aria-hidden="true" />)}
        </li>
      ))}
    </ul>
  );
}

function MemberActionsMenu({
  member: _member,
  onRevoke,
}: {
  member: TeamMember;
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
          Fjern medlem
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
        <p className="text-sm text-foreground-muted mb-2">
          Kunne ikke opprette invitasjonslenke.
        </p>
        <button
          type="button"
          className="text-sm text-foreground underline-offset-4 hover:underline disabled:opacity-50"
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
          className="h-9 w-full rounded-md border border-border bg-surface pl-3 pr-10 text-sm text-foreground outline-none focus:border-foreground"
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
        className="mt-2 text-xs text-foreground-muted underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
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

function MembersTableSkeleton() {
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
          <div className="min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </li>
      ))}
    </ul>
  );
}
