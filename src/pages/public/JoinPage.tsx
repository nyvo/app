import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DelayedFallback } from '@/components/ui/delayed-fallback';
import { BrandFooter } from '@/components/public/BrandFooter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { acceptInvitation, lookupInvitation } from '@/services/invitations';
import { friendlyError } from '@/lib/error-messages';
import { GENERIC_ERROR } from '@/lib/error-strings';
import { routes } from '@/lib/routes';
import type { LookupInvitationResult } from '@/services/invitations';

// ---------------------------------------------------------------------------
// /join/:token — accept page for an emailed instructor invitation.
//
// States:
//   1. Valid, signed in     → "{Studio} har invitert deg" + Godta
//   2. In another studio    → "Forlat og bli med" with confirm
//   3. Logged out           → Logg inn (returns here after auth)
//   4. Expired / not_found  → message only
//   5. Already used         → "Invitasjonen er allerede brukt" + Min side
//   6. Wrong account        → no-access / wrong-email / studio-account
//
// The invitation is bound to the invitee's email and only solo accounts can
// accept — both enforced in accept_seller_invitation; this page just renders
// the returned statuses.
// ---------------------------------------------------------------------------

type LookupState =
  | { status: 'loading' }
  | { status: 'valid'; team: LookupInvitationResult }
  | { status: 'accepted'; team: LookupInvitationResult }
  | { status: 'expired' }
  | { status: 'not_found' }
  | { status: 'error' };

type JoinPhase =
  | { kind: 'idle' }
  | { kind: 'accepting' }
  | { kind: 'need_force_leave'; existingTeamName: string | null }
  | { kind: 'already_member' }
  | { kind: 'own_team' }
  | { kind: 'no_access' }
  | { kind: 'wrong_email' }
  | { kind: 'studio_account' };

function Shell({ children }: { children: React.ReactNode }) {
  // The invitation is from the studio, so the page leads with the studio's
  // name — the platform mark sits as quiet attribution at the bottom instead
  // of a header claiming the page.
  return (
    <div className="min-h-dvh w-full text-foreground antialiased flex flex-col bg-background selection:bg-muted selection:text-foreground">
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
          {children}
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isInitialized } = useAuth();

  const [lookup, setLookup] = useState<LookupState>({ status: 'loading' });
  const [phase, setPhase] = useState<JoinPhase>({ kind: 'idle' });

  // Lookup the invitation on mount (public-safe RPC).
  useEffect(() => {
    if (!token) {
      setLookup({ status: 'not_found' });
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await lookupInvitation(token);
      if (cancelled) return;
      // A network/query failure is retryable — keep it distinct from a genuine
      // not_found so the invitee doesn't see the terminal "Lenken finnes ikke".
      if (error) {
        setLookup({ status: 'error' });
      } else if (!data || data.status === 'not_found') {
        setLookup({ status: 'not_found' });
      } else if (data.status === 'expired') {
        setLookup({ status: 'expired' });
      } else if (data.status === 'accepted') {
        setLookup({ status: 'accepted', team: data });
      } else {
        setLookup({ status: 'valid', team: data });
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleAccept = async (forceLeave = false) => {
    if (!token) return;
    setPhase({ kind: 'accepting' });
    const { data, error } = await acceptInvitation(token, forceLeave);
    if (error || !data) {
      toast.error(friendlyError(error));
      setPhase({ kind: 'idle' });
      return;
    }

    switch (data.status) {
      case 'joined':
        // Land on /samarbeid so the accept ends with visible confirmation.
        navigate(routes.samarbeid, { replace: true });
        return;
      case 'already_affiliated':
        setPhase({ kind: 'already_member' });
        return;
      case 'own_storefront':
        setPhase({ kind: 'own_team' });
        return;
      case 'no_seller':
        // Authoritative fallback: the account isn't an instructor. The render
        // below pre-empts this for known buyers; a role-less user lands here.
        setPhase({ kind: 'no_access' });
        return;
      case 'wrong_email':
        setPhase({ kind: 'wrong_email' });
        return;
      case 'studio_account':
        setPhase({ kind: 'studio_account' });
        return;
      case 'has_other_host': {
        // Fetch the leaving studio's name for the confirm copy.
        let existingTeamName: string | null = null;
        if (data.existing_host_seller_id) {
          const { data: t } = await supabase
            .from('sellers')
            .select('name')
            .eq('id', data.existing_host_seller_id)
            .maybeSingle();
          existingTeamName = (t as { name: string } | null)?.name ?? null;
        }
        setPhase({ kind: 'need_force_leave', existingTeamName });
        return;
      }
      case 'expired':
        setLookup({ status: 'expired' });
        setPhase({ kind: 'idle' });
        return;
      case 'not_found':
        setLookup({ status: 'not_found' });
        setPhase({ kind: 'idle' });
        return;
      default:
        toast.error(GENERIC_ERROR);
        setPhase({ kind: 'idle' });
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────

  if (lookup.status === 'loading' || !isInitialized) {
    return (
      <Shell>
        <DelayedFallback>
          <div role="status" aria-live="polite" className="space-y-6">
            <span className="sr-only">Laster…</span>
            <div className="space-y-3">
              <Skeleton className="mx-auto h-8 w-56" />
              <Skeleton className="mx-auto h-4 w-72 max-w-full" />
            </div>
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
        </DelayedFallback>
      </Shell>
    );
  }

  if (lookup.status === 'not_found') {
    return (
      <Shell>
        <h1 className="text-3xl font-medium text-foreground mb-3">
          Lenken finnes ikke
        </h1>
        <p className="text-base text-foreground-muted">
          Sjekk at du har riktig lenke, eller be studioet om en ny invitasjon.
        </p>
      </Shell>
    );
  }

  if (lookup.status === 'error') {
    return (
      <Shell>
        <h1 className="text-3xl font-medium text-foreground mb-8">
          Noe gikk galt
        </h1>
        <Button size="cta" className="w-full" onClick={() => window.location.reload()}>
          Prøv igjen
        </Button>
      </Shell>
    );
  }

  if (lookup.status === 'expired') {
    return (
      <Shell>
        <h1 className="text-3xl font-medium text-foreground mb-3">
          Invitasjonen er utløpt
        </h1>
        <p className="text-base text-foreground-muted">
          Be studioet om en ny invitasjon for å bli med.
        </p>
      </Shell>
    );
  }

  if (lookup.status === 'accepted') {
    return (
      <Shell>
        <h1 className="text-3xl font-medium text-foreground mb-8">
          Invitasjonen er allerede brukt
        </h1>
        <Button size="cta" className="w-full" onClick={() => navigate(routes.samarbeid)}>
          Min side
        </Button>
      </Shell>
    );
  }

  const team = lookup.team;

  // State 3 — logged out
  if (!user) {
    return (
      <Shell>
        <h1 className="text-3xl font-medium text-foreground mb-3">
          {team.name} har invitert deg
        </h1>
        <p className="text-base text-foreground-muted mb-8">
          Logg inn eller opprett en konto for å fortsette. Du kommer tilbake hit etterpå.
        </p>
        <Button
          size="cta"
          className="w-full"
          // Invitations are for instructors → seller intent skips the role
          // chooser; `next` brings the user back here after onboarding.
          onClick={() =>
            navigate(`/auth?intent=seller&next=${encodeURIComponent(location.pathname)}`)
          }
        >
          Logg inn
        </Button>
      </Shell>
    );
  }

  // No access — a participant (buyer) account can't affiliate with a studio.
  // The 'no_access' phase is the server-authoritative fallback (no_seller).
  if (phase.kind === 'no_access' || (profile !== null && profile.role !== 'seller')) {
    return (
      <Shell>
        <h1 className="text-3xl font-medium text-foreground mb-8">
          Du har ikke tilgang
        </h1>
        <Button size="cta" className="w-full" onClick={() => navigate('/overview')}>
          Gå til min side
        </Button>
      </Shell>
    );
  }

  if (phase.kind === 'wrong_email') {
    return (
      <Shell>
        <h1 className="text-3xl font-medium text-foreground mb-3">
          Invitasjonen gjelder en annen e-postadresse
        </h1>
        <p className="text-base text-foreground-muted mb-8">
          Logg inn med kontoen som mottok e-posten, eller be studioet invitere deg på nytt.
        </p>
        <Button size="cta" className="w-full" onClick={() => navigate('/overview')}>
          Gå til min side
        </Button>
      </Shell>
    );
  }

  if (phase.kind === 'studio_account') {
    return (
      <Shell>
        <h1 className="text-3xl font-medium text-foreground mb-3">
          Invitasjonen er for instruktører
        </h1>
        <p className="text-base text-foreground-muted mb-8">
          Kontoen din er et studio og kan ikke vises på et annet studio.
        </p>
        <Button size="cta" className="w-full" onClick={() => navigate(routes.samarbeid)}>
          Til Samarbeid
        </Button>
      </Shell>
    );
  }

  if (phase.kind === 'already_member') {
    return (
      <Shell>
        <h1 className="text-3xl font-medium text-foreground mb-3">
          Du er allerede med
        </h1>
        <p className="text-base text-foreground-muted mb-8">
          Du er allerede medlem av {team.name}.
        </p>
        <Button size="cta" className="w-full" onClick={() => navigate(routes.samarbeid)}>
          Min side
        </Button>
      </Shell>
    );
  }

  // Self-affiliation guard
  if (phase.kind === 'own_team') {
    return (
      <Shell>
        <h1 className="text-3xl font-medium text-foreground mb-3">
          Dette er ditt eget studio
        </h1>
        <p className="text-base text-foreground-muted mb-8">
          Du kan ikke bli medlem av ditt eget studio.
        </p>
        <Button size="cta" className="w-full" onClick={() => navigate(routes.studio)}>
          Til Studio
        </Button>
      </Shell>
    );
  }

  // State 2 — in another studio, need to confirm leave
  if (phase.kind === 'need_force_leave') {
    const leavingName = phase.existingTeamName ?? 'det forrige studioet';
    return (
      <Shell>
        <h1 className="text-3xl font-medium text-foreground mb-3">
          {team.name} har invitert deg
        </h1>
        <p className="text-base text-foreground-muted mb-6">
          Du kan være med i ett studio om gangen. Blir du med her, forlater du:
        </p>
        <div className="border border-border rounded-xl bg-surface p-5 mb-8 text-left">
          <div className="text-base font-medium text-foreground">{leavingName}</div>
        </div>
        <Button
          size="cta"
          className="w-full"
          onClick={() => void handleAccept(true)}
        >
          Forlat og bli med
        </Button>
        <Button
          size="cta"
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => navigate(routes.samarbeid)}
        >
          Avbryt
        </Button>
      </Shell>
    );
  }

  // State 1 — clean accept (default for logged-in instructor, idle phase)
  return (
    <Shell>
      <h1 className="text-3xl font-medium text-foreground mb-3">
        {team.name} har invitert deg
      </h1>
      <p className="text-base text-foreground-muted mb-8">
        Kursene dine vises på studiosiden deres.
      </p>
      <Button
        size="cta"
        className="w-full"
        onClick={() => void handleAccept(false)}
        loading={phase.kind === 'accepting'}
        loadingText="Godtar"
      >
        Godta
      </Button>
    </Shell>
  );
}
