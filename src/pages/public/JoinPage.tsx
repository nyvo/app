import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DelayedFallback } from '@/components/ui/delayed-fallback';
import { UpNextLogo } from '@/components/ui/upnext-logo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { lookupInviteLink, redeemInviteLink } from '@/services/invite-links';
import { friendlyError } from '@/lib/error-messages';
import { GENERIC_ERROR } from '@/lib/error-strings';
import { routes } from '@/lib/routes';
import type { LookupInviteLinkResult } from '@/types/database';

// ---------------------------------------------------------------------------
// /join/:code — public landing for a shareable invite link.
//
// Five states:
//   1. Not in a team       → primary "Bli med"
//   2. In another team     → "Forlat og bli med" with the leaving team named
//   3. Logged out          → "Logg inn" + "Opprett konto" (return after auth)
//   4. Expired / not_found → message, single "Tilbake" ghost
//   5. Already a member    → message + link to /studio#samarbeid
//
// The join page DOES the "leave current team and switch" confirm — there's no
// async "pending invite" state in the dashboard, by design.
// ---------------------------------------------------------------------------

type LookupState =
  | { status: 'loading' }
  | { status: 'valid'; team: LookupInviteLinkResult }
  | { status: 'expired' }
  | { status: 'not_found' }
  | { status: 'error' };

type JoinPhase =
  | { kind: 'idle' }
  | { kind: 'checking_membership' }
  | { kind: 'redeeming' }
  | { kind: 'need_force_leave'; existingTeamName: string | null }
  | { kind: 'already_member' }
  | { kind: 'own_team' }
  | { kind: 'no_access' };

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
      <footer className="flex justify-center pb-8">
        <Link
          to="/"
          aria-label="UpNext"
          className="flex select-none items-center gap-2 opacity-40 transition-opacity duration-150 hover:opacity-70"
        >
          <UpNextLogo size="sm" />
          <span className="text-sm font-medium text-foreground">UpNext</span>
        </Link>
      </footer>
    </div>
  );
}

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isInitialized, currentSeller } = useAuth();

  const [lookup, setLookup] = useState<LookupState>({ status: 'loading' });
  const [phase, setPhase] = useState<JoinPhase>({ kind: 'idle' });

  // Lookup the link on mount (public-safe RPC).
  useEffect(() => {
    if (!code) {
      setLookup({ status: 'not_found' });
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await lookupInviteLink(code);
      if (cancelled) return;
      // A network/query failure is retryable — keep it distinct from a genuine
      // not_found so the buyer doesn't see the terminal "Lenken finnes ikke".
      if (error) {
        setLookup({ status: 'error' });
      } else if (!data || data.status === 'not_found') {
        setLookup({ status: 'not_found' });
      } else if (data.status === 'expired') {
        setLookup({ status: 'expired' });
      } else {
        setLookup({ status: 'valid', team: data });
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  // Logged-in preflight: the public lookup only validates the invite code.
  // Check the current seller's membership before showing the join CTA so an
  // existing member doesn't see "Bli med" as the default state.
  useEffect(() => {
    if (lookup.status !== 'valid' || !user || profile?.role !== 'seller' || !currentSeller) {
      return;
    }

    let cancelled = false;
    const hostSellerId = lookup.team.host_seller_id;

    setPhase({ kind: 'checking_membership' });

    void (async () => {
      if (currentSeller?.id === hostSellerId) {
        if (!cancelled) setPhase({ kind: 'own_team' });
        return;
      }

      const { data, error } = await supabase
        .from('seller_affiliations')
        .select('host_seller_id, host:sellers!seller_affiliations_host_fkey(name)')
        .eq('guest_seller_id', currentSeller.id)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setPhase({ kind: 'idle' });
        return;
      }

      const activeAffiliation = data as {
        host_seller_id: string;
        host: { name: string } | null;
      };

      if (activeAffiliation.host_seller_id === hostSellerId) {
        setPhase({ kind: 'already_member' });
        return;
      }

      setPhase({
        kind: 'need_force_leave',
        existingTeamName: activeAffiliation.host?.name ?? null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [lookup, user, profile?.role, currentSeller]);

  const handleJoin = async (forceLeave = false) => {
    if (!code) return;
    setPhase({ kind: 'redeeming' });
    const { data, error } = await redeemInviteLink(code, forceLeave);
    if (error || !data) {
      toast.error(friendlyError(error));
      setPhase({ kind: 'idle' });
      return;
    }

    switch (data.status) {
      case 'joined':
        // Land on the Samarbeid section so the join ends with visible
        // confirmation ("Kursene dine vises på …") instead of a bare page.
        navigate(routes.studioSamarbeid, { replace: true });
        return;
      case 'already_affiliated':
        setPhase({ kind: 'already_member' });
        return;
      case 'own_storefront':
        setPhase({ kind: 'own_team' });
        return;
      case 'no_seller':
        // Authoritative fallback: account isn't an instructor, so it can't
        // affiliate with a studio. The render below pre-empts this for known
        // buyers, but a role-less / lagging-profile user lands here.
        setPhase({ kind: 'no_access' });
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
          Sjekk at du har riktig lenke, eller be studioet om en ny.
        </p>
      </Shell>
    );
  }

  if (lookup.status === 'error') {
    return (
      <Shell>
        <h1 className="text-3xl font-medium text-foreground mb-3">
          Noe gikk galt
        </h1>
        <p className="text-base text-foreground-muted mb-8">
          Prøv igjen.
        </p>
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
          Lenken er utløpt
        </h1>
        <p className="text-base text-foreground-muted">
          Be studioet om en ny invitasjonslenke for å bli med.
        </p>
      </Shell>
    );
  }

  const team = lookup.team;

  // State 3 — logged out
  if (!user) {
    return (
      <Shell>
        <h1 className="text-3xl font-medium text-foreground mb-3">
          Bli med i {team.name}
        </h1>
        <p className="text-base text-foreground-muted mb-8">
          Logg inn eller opprett en konto for å fortsette. Du kommer tilbake hit etterpå.
        </p>
        <Button
          size="cta"
          className="w-full"
          // Studio invites are for instructors → seller intent skips the role
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

  // No access — studio invites are for instructors. A participant (buyer)
  // account can't affiliate with a studio, so explain why the link doesn't
  // apply instead of offering a join it can't complete. We know the account is
  // a non-instructor when its profile is loaded and the role isn't 'seller';
  // the 'no_access' phase is the server-authoritative fallback (no_seller).
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

  if (phase.kind === 'checking_membership') {
    return (
      <Shell>
        <div role="status" aria-live="polite" className="space-y-6">
          <span className="sr-only">Sjekker medlemskap…</span>
          <div className="space-y-3">
            <Skeleton className="mx-auto h-8 w-56" />
            <Skeleton className="mx-auto h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
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
        <Button size="cta" className="w-full" onClick={() => navigate(routes.studioSamarbeid)}>
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

  // State 2 — in another team, need to confirm leave
  if (phase.kind === 'need_force_leave') {
    const leavingName = phase.existingTeamName ?? 'det forrige studioet';
    return (
      <Shell>
        <h1 className="text-3xl font-medium text-foreground mb-3">
          Bli med i {team.name}
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
          onClick={() => void handleJoin(true)}
        >
          Forlat og bli med
        </Button>
        <Button
          size="cta"
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => navigate(routes.studio)}
        >
          Avbryt
        </Button>
      </Shell>
    );
  }

  // State 1 — clean join (default for logged-in user, idle phase)
  return (
    <Shell>
      <h1 className="text-3xl font-medium text-foreground mb-3">
        Bli med i {team.name}
      </h1>
      <p className="text-base text-foreground-muted mb-8">
        Kursene dine vises på studiosiden deres.
      </p>
      <Button
        size="cta"
        className="w-full"
        onClick={() => void handleJoin(false)}
        loading={phase.kind === 'redeeming'}
        loadingText="Blir med"
      >
        Bli med
      </Button>
    </Shell>
  );
}
