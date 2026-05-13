import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ImageIcon, MoreVertical } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ConfirmDialog, ConfirmScopeItem } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
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

  const refresh = useCallback(async () => {
    setLoadingMembers(true);
    const { data } = await fetchTeamMembers(teamId);
    setMembers(data);
    setLoadingMembers(false);
  }, [teamId]);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <div className="space-y-6">
      <InviteLinkPanel teamId={teamId} />
      <MembersTable
        members={members}
        loading={loadingMembers}
        kebabFor={(m) => (m.role === 'owner' ? null : (
          <MemberActionsMenu
            teamId={teamId}
            member={m}
            onRevoked={refresh}
          />
        ))}
      />
    </div>
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
      toast.error(error.message);
      return;
    }
    toast.success('Du har forlatt teamet.');
    setHost(null);
    setMembers(null);
  };

  if (host === undefined) {
    return <LoadingRow />;
  }

  if (host === null) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center">
        <p className="text-sm font-medium text-foreground">Du har ikke et team enda</p>
        <p className="text-sm text-foreground-muted mt-1 max-w-xs mx-auto">
          Be studioet om en invitasjonslenke, eller åpne lenken du har fått.
        </p>
      </div>
    );
  }

  return (
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
          className="text-danger"
          onClick={() => setConfirmLeave(true)}
        >
          Forlat team
        </Button>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        ariaLabel="Forlat team"
        headline="Kursene dine slutter å vises på studio-siden. Du kan bli invitert på nytt senere."
        scope={<ConfirmScopeItem name={host.name} meta="Medlem av teamet" />}
        actionLabel="Forlat team"
        onConfirm={handleLeave}
        loading={leaving}
        loadingText="Forlater"
      />
    </div>
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
    return (
      <div className="rounded-md border border-border bg-surface">
        <div className="p-4"><LoadingRow /></div>
      </div>
    );
  }
  if (members.length === 0) {
    return (
      <div className="rounded-md border border-border bg-surface p-4">
        <p className="text-sm text-foreground-muted">Ingen medlemmer ennå.</p>
      </div>
    );
  }
  const hasKebab = !!kebabFor;
  return (
    <ul className="rounded-md border border-border bg-surface overflow-hidden">
      {members.map((m, i) => (
        <li
          key={m.sellerId}
          className={cn(
            'grid items-center gap-4 px-4 py-3',
            hasKebab ? 'grid-cols-[1fr_auto_auto]' : 'grid-cols-[1fr_auto]',
            i > 0 && 'border-t border-border',
          )}
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
  teamId,
  member,
  onRevoked,
}: {
  teamId: string;
  member: TeamMember;
  onRevoked: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleRevoke = async () => {
    setDeleting(true);
    const { error } = await revokeAffiliation({
      teamId,
      sellerId: member.sellerId,
    });
    setDeleting(false);
    setConfirmOpen(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Fjernet fra teamet.');
    onRevoked();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Handlinger">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-danger focus:text-danger"
            onClick={() => setConfirmOpen(true)}
          >
            Fjern medlem
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        ariaLabel="Fjern fra team"
        headline="Kursene blir fjernet fra studio-siden din."
        scope={<ConfirmScopeItem name={member.name} meta="Medlem av teamet" />}
        actionLabel="Fjern fra team"
        onConfirm={handleRevoke}
        loading={deleting}
        loadingText="Fjerner"
      />
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Invite link panel — replaces the old email invite form
// ───────────────────────────────────────────────────────────────────────────

function InviteLinkPanel({ teamId }: { teamId: string }) {
  const [link, setLink] = useState<TeamInviteLink | null | undefined>(undefined);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await fetchActiveInviteLink(teamId);
    setLink(data);
  }, [teamId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleGenerate = async () => {
    setCreating(true);
    const { data, error } = await createInviteLink(teamId);
    setCreating(false);
    if (error || !data) {
      toast.error(error?.message ?? 'Kunne ikke lage lenke.');
      return;
    }
    setLink(data);
    toast.success('Ny lenke laget.');
  };

  const handleCopy = async () => {
    if (!link) return;
    const url = `${window.location.origin}/join/${link.code}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Lenke kopiert.');
    } catch {
      toast.error('Kunne ikke kopiere — kopier manuelt.');
    }
  };

  // Loading shimmer
  if (link === undefined) {
    return (
      <div>
        <div className="flex gap-2">
          <div className="h-9 flex-1 rounded-md border border-border bg-muted" />
          <div className="h-9 w-20 rounded-full bg-muted" />
        </div>
      </div>
    );
  }

  if (!link) {
    return (
      <div>
        <p className="text-sm text-foreground-muted mb-2">
          Du har ikke en aktiv invitasjonslenke.
        </p>
        <Button
          size="sm"
          onClick={() => void handleGenerate()}
          loading={creating}
          loadingText="Lager"
        >
          Lag invitasjonslenke
        </Button>
      </div>
    );
  }

  const host = window.location.host;
  const expires = new Date(link.expires_at);
  const daysLeft = Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 86400000));

  return (
    <div>
      <div className="flex gap-2">
        <div className="flex h-9 flex-1 items-center rounded-md border border-border bg-surface text-sm overflow-hidden min-w-0">
          <span className="pl-3 text-foreground-muted shrink-0">{host}</span>
          <span className="px-1 text-foreground-muted shrink-0">/</span>
          <span className="text-foreground-muted shrink-0">join</span>
          <span className="px-1 text-foreground-muted shrink-0">/</span>
          <input
            readOnly
            value={link.code}
            className="flex-1 min-w-0 bg-transparent pr-3 text-foreground outline-none tabular-nums"
            aria-label="Invitasjonskode"
          />
        </div>
        <Button variant="outline-soft" size="sm" onClick={() => void handleCopy()}>
          Kopier
        </Button>
      </div>
      <p className="mt-2 text-xs text-foreground-muted">
        Gyldig i {daysLeft} {daysLeft === 1 ? 'dag' : 'dager'}.{' '}
        <button
          type="button"
          className="underline hover:text-foreground transition-colors disabled:opacity-50"
          disabled={creating}
          onClick={() => void handleGenerate()}
        >
          {creating ? 'Lager …' : 'Lag ny lenke'}
        </button>
      </p>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Misc
// ───────────────────────────────────────────────────────────────────────────

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 text-sm text-foreground-muted">
      <Spinner size="sm" />
      Laster …
    </div>
  );
}
