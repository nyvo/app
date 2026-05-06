import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Mail, X, Check, UserPlus, Trash2, ChevronDown, LogOut } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { fetchCourses } from '@/services/courses';
import {
  fetchIncomingInvites,
  fetchTeamAffiliates,
  inviteAffiliateByEmail,
  respondToInvite,
  revokeAffiliation,
  fetchListedCourseIds,
  addCourseListing,
  removeCourseListing,
  type IncomingInvite,
  type OutgoingAffiliate,
} from '@/services/affiliations';
import type { Course } from '@/types/database';

// ---------------------------------------------------------------------------
// Affiliations UI — storefront syndication.
//
// Three panels:
//   1. "Invitasjoner til deg"     — pending invites (Godta / Avslå)
//   2. "Du samarbeider med"       — active affiliations the user accepted,
//                                    with per-course listing toggles + leave
//   3. "På din studio-side"       — affiliates of the user's OWN team,
//                                    with revoke + invite-by-email form
// ---------------------------------------------------------------------------

export function AffiliationsSection() {
  const { sellers, currentSeller, currentTeam, user } = useAuth();
  const sellerIds = useMemo(() => sellers.map((s) => s.id), [sellers]);

  const [invitesAndActive, setInvitesAndActive] = useState<IncomingInvite[]>([]);
  const [incomingLoading, setIncomingLoading] = useState(true);

  const [affiliates, setAffiliates] = useState<OutgoingAffiliate[]>([]);
  const [affiliatesLoading, setAffiliatesLoading] = useState(true);

  const loadIncoming = useCallback(async () => {
    if (sellerIds.length === 0) {
      setInvitesAndActive([]);
      setIncomingLoading(false);
      return;
    }
    setIncomingLoading(true);
    const { data } = await fetchIncomingInvites(sellerIds);
    // Drop declined rows from the freelancer view (clutter once said no).
    setInvitesAndActive(data.filter((r) => r.status !== 'declined'));
    setIncomingLoading(false);
  }, [sellerIds]);

  const loadAffiliates = useCallback(async () => {
    if (!currentTeam?.id) {
      setAffiliates([]);
      setAffiliatesLoading(false);
      return;
    }
    setAffiliatesLoading(true);
    const { data } = await fetchTeamAffiliates(currentTeam.id);
    setAffiliates(data.filter((r) => r.status !== 'declined'));
    setAffiliatesLoading(false);
  }, [currentTeam?.id]);

  useEffect(() => { loadIncoming(); }, [loadIncoming]);
  useEffect(() => { loadAffiliates(); }, [loadAffiliates]);

  const pendingInvites = invitesAndActive.filter((r) => r.status === 'pending');
  const activeInvites = invitesAndActive.filter((r) => r.status === 'active');

  return (
    <section aria-labelledby="affiliations-heading" className="space-y-8">
      <header>
        <h2 id="affiliations-heading" className="text-lg font-semibold text-foreground">
          Samarbeid
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          La andre instruktørers kurs vises på din studio-side, eller bli
          invitert til å vises på en annen.
        </p>
      </header>

      {/* Panel 1: Pending incoming invites */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Invitasjoner til deg</h3>
        {incomingLoading ? (
          <LoadingRow />
        ) : pendingInvites.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Du har ingen åpne invitasjoner.
          </p>
        ) : (
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <PendingInviteCard
                key={`${invite.team_id}-${invite.seller_id}`}
                invite={invite}
                onResponded={loadIncoming}
              />
            ))}
          </div>
        )}
      </div>

      {/* Panel 2: Active affiliations (freelancer side) */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Du samarbeider med</h3>
        <p className="text-xs text-muted-foreground">
          Velg hvilke kurs som skal vises på studio-sider du samarbeider med.
        </p>
        {incomingLoading ? (
          <LoadingRow />
        ) : activeInvites.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ingen aktive samarbeid ennå.
          </p>
        ) : (
          <div className="space-y-2">
            {activeInvites.map((invite) => (
              <ActiveAffiliationCard
                key={`${invite.team_id}-${invite.seller_id}`}
                invite={invite}
                onChanged={loadIncoming}
              />
            ))}
          </div>
        )}
      </div>

      {/* Panel 3: My team's affiliates + invite form */}
      {currentTeam && currentSeller ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">På din studio-side</h3>
          <p className="text-xs text-muted-foreground">
            Inviter andre instruktører til å la kursene sine vises på{' '}
            <span className="font-medium text-foreground">{currentTeam.name}</span>.
          </p>

          <InviteForm
            teamId={currentTeam.id}
            inviterUserId={user?.id ?? null}
            onInvited={loadAffiliates}
          />

          {affiliatesLoading ? (
            <LoadingRow />
          ) : affiliates.length === 0 ? (
            <p className="text-sm text-muted-foreground pt-2">
              Ingen samarbeid ennå.
            </p>
          ) : (
            <div className="space-y-2 pt-2">
              {affiliates.map((aff) => (
                <AffiliateCard
                  key={`${aff.team_id}-${aff.seller_id}`}
                  affiliate={aff}
                  onChanged={loadAffiliates}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner size="sm" />
      Laster …
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pending incoming invite — Godta / Avslå
// ---------------------------------------------------------------------------

function PendingInviteCard({
  invite,
  onResponded,
}: {
  invite: IncomingInvite;
  onResponded: () => void;
}) {
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);

  const respond = async (accept: boolean) => {
    setBusy(accept ? 'accept' : 'decline');
    const { error } = await respondToInvite({
      teamId: invite.team_id,
      sellerId: invite.seller_id,
      accept,
    });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(accept ? 'Invitasjon godtatt.' : 'Invitasjon avslått.');
    onResponded();
  };

  return (
    <Card className="gap-0 p-0">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{invite.team.name}</p>
          {invite.team.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {invite.team.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => respond(true)}
            loading={busy === 'accept'}
            disabled={busy !== null}
          >
            <Check className="size-3.5" />
            Godta
          </Button>
          <Button
            variant="outline-soft"
            size="sm"
            onClick={() => respond(false)}
            loading={busy === 'decline'}
            disabled={busy !== null}
          >
            <X className="size-3.5" />
            Avslå
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Active affiliation — expandable course-listing toggles + leave button
// ---------------------------------------------------------------------------

function ActiveAffiliationCard({
  invite,
  onChanged,
}: {
  invite: IncomingInvite;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const [courses, setCourses] = useState<Course[] | null>(null);
  const [listedIds, setListedIds] = useState<Set<string>>(new Set());
  const [loadingList, setLoadingList] = useState(false);
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    if (!expanded) return;
    setLoadingList(true);
    const [coursesResult, listedResult] = await Promise.all([
      courses === null
        ? fetchCourses(invite.seller_id)
        : Promise.resolve({ data: courses, error: null }),
      fetchListedCourseIds({ teamId: invite.team_id, sellerId: invite.seller_id }),
    ]);
    if (!coursesResult.error && coursesResult.data) setCourses(coursesResult.data);
    if (!listedResult.error) setListedIds(listedResult.data);
    setLoadingList(false);
  }, [expanded, invite.team_id, invite.seller_id, courses]);

  useEffect(() => { loadList(); }, [loadList]);

  const toggleCourse = async (courseId: string, listed: boolean) => {
    setPendingToggleId(courseId);
    // Optimistic update
    setListedIds((prev) => {
      const next = new Set(prev);
      if (listed) next.add(courseId);
      else next.delete(courseId);
      return next;
    });
    const { error } = listed
      ? await addCourseListing({ courseId, teamId: invite.team_id })
      : await removeCourseListing({ courseId, teamId: invite.team_id });
    setPendingToggleId(null);
    if (error) {
      // Revert on error
      setListedIds((prev) => {
        const next = new Set(prev);
        if (listed) next.delete(courseId);
        else next.add(courseId);
        return next;
      });
      toast.error(error.message);
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    const { error } = await revokeAffiliation({
      teamId: invite.team_id,
      sellerId: invite.seller_id,
    });
    setLeaving(false);
    setConfirmLeave(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Samarbeid avsluttet.');
    onChanged();
  };

  // Filter to publishable course statuses; drafts can be listed but in
  // practice teachers list active/upcoming courses. Show all for control.
  const visibleCourses = courses ?? [];

  return (
    <>
      <Card className="gap-0 p-0">
        <CardContent className="p-0">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="w-full flex items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/40 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <ChevronDown
                className={cn(
                  'size-4 shrink-0 text-muted-foreground transition-transform',
                  !expanded && '-rotate-90',
                )}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{invite.team.name}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5 tabular-nums">
                  {listedIds.size} kurs vises
                </p>
              </div>
            </div>
          </button>

          {expanded && (
            <div className="border-t border-border px-4 py-4 space-y-4">
              {loadingList ? (
                <LoadingRow />
              ) : visibleCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Du har ingen kurs ennå. Opprett et kurs for å la det vises på{' '}
                  {invite.team.name}.
                </p>
              ) : (
                <div className="space-y-1">
                  {visibleCourses.map((c) => {
                    const isListed = listedIds.has(c.id);
                    const isPending = pendingToggleId === c.id;
                    return (
                      <label
                        key={c.id}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-2 py-1.5 cursor-pointer hover:bg-muted/40 transition-colors',
                          isPending && 'opacity-60',
                        )}
                      >
                        <Checkbox
                          checked={isListed}
                          onCheckedChange={(checked) => toggleCourse(c.id, !!checked)}
                          disabled={isPending}
                          aria-label={`Vis ${c.title} på ${invite.team.name}`}
                        />
                        <span className="text-sm text-foreground truncate flex-1">{c.title}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-border pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmLeave(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="size-3.5" />
                  Avslutt samarbeid
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avslutt samarbeid med {invite.team.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Kursene dine slutter å vises på {invite.team.name} sin side. Du kan
              bli invitert på nytt senere.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave} disabled={leaving} variant="destructive">
              {leaving ? 'Avslutter …' : 'Avslutt'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Invite-by-email form (studio side)
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function InviteForm({
  teamId,
  inviterUserId,
  onInvited,
}: {
  teamId: string;
  inviterUserId: string | null;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviterUserId) return;
    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      toast.error('Skriv inn en gyldig e-post.');
      return;
    }
    setSubmitting(true);
    const { error } = await inviteAffiliateByEmail({
      teamId,
      email: trimmed,
      inviterUserId,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Invitasjon sendt.');
    setEmail('');
    onInvited();
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          type="email"
          placeholder="instruktør@eksempel.no"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="pl-9"
          disabled={submitting}
        />
      </div>
      <Button type="submit" disabled={submitting || !email.trim()} loading={submitting}>
        <UserPlus className="size-4" />
        Inviter
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Studio's view of an affiliate (revoke button + status pill)
// ---------------------------------------------------------------------------

function AffiliateCard({
  affiliate,
  onChanged,
}: {
  affiliate: OutgoingAffiliate;
  onChanged: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleRevoke = async () => {
    setDeleting(true);
    const { error } = await revokeAffiliation({
      teamId: affiliate.team_id,
      sellerId: affiliate.seller_id,
    });
    setDeleting(false);
    setConfirmOpen(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Samarbeid avsluttet.');
    onChanged();
  };

  const isPending = affiliate.status === 'pending';

  return (
    <>
      <Card className="gap-0 p-0">
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground truncate">
                {affiliate.seller.name}
              </p>
              {isPending && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                  Venter
                </span>
              )}
            </div>
            {affiliate.seller.city && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {affiliate.seller.city}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            aria-label={isPending ? 'Trekk tilbake invitasjon' : 'Avslutt samarbeid'}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPending ? 'Trekk tilbake invitasjon?' : 'Avslutt samarbeid?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isPending
                ? `Invitasjonen til ${affiliate.seller.name} fjernes. Du kan invitere på nytt senere.`
                : `Kurs fra ${affiliate.seller.name} blir fjernet fra studio-siden din.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} disabled={deleting} variant="destructive">
              {deleting ? 'Fjerner …' : 'Bekreft'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
