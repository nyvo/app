import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ImageIcon } from '@/lib/icons';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { authPageVariants, authPageTransition } from '@/lib/motion';
import { supabase } from '@/lib/supabase';
import { lookupInviteLink, redeemInviteLink } from '@/services/invite-links';
import { friendlyError } from '@/lib/error-messages';
import type { LookupTeamInviteLinkResult } from '@/types/database';

// ---------------------------------------------------------------------------
// /join/:code — public landing for a shareable invite link.
//
// Five states (matches preview/samarbeid-split.html "Join page" section):
//   1. Not in a team       → primary "Bli med"
//   2. In another team     → "Forlat og bli med" with the leaving team named
//   3. Logged out          → "Logg inn" + "Opprett konto" (return after auth)
//   4. Expired / not_found → message, single "Tilbake" ghost
//   5. Already a member    → "Til timeplanen"
//
// The join page DOES the "leave current team and switch" confirm — there's no
// async "pending invite" state in the dashboard, by design.
// ---------------------------------------------------------------------------

type LookupState =
  | { status: 'loading' }
  | { status: 'valid'; team: LookupTeamInviteLinkResult }
  | { status: 'expired' }
  | { status: 'not_found' };

type JoinPhase =
  | { kind: 'idle' }
  | { kind: 'redeeming' }
  | { kind: 'need_force_leave'; existingTeamName: string | null }
  | { kind: 'joined' }
  | { kind: 'already_member' }
  | { kind: 'own_team' };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full text-foreground antialiased flex flex-col bg-background selection:bg-muted selection:text-foreground">
      <header className="w-full pt-8 pb-4 px-6 flex items-center justify-center max-w-6xl mx-auto">
        <Link to="/" className="flex items-center select-none">
          <span className="text-base font-medium text-foreground">Openspot</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6">
        <motion.div
          variants={authPageVariants}
          initial="initial"
          animate="animate"
          transition={authPageTransition}
          className="w-full max-w-md text-center"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

function Cover({ url }: { url: string | null }) {
  if (url) {
    return (
      <div className="aspect-[3/1] w-full overflow-hidden rounded-md bg-muted mb-6">
        <img src={url} alt="" className="size-full object-cover" />
      </div>
    );
  }
  return (
    <div className="aspect-[3/1] w-full rounded-md bg-muted mb-6 flex items-center justify-center">
      <ImageIcon className="size-10 text-foreground-muted" aria-hidden="true" />
    </div>
  );
}

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isInitialized } = useAuth();

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
      const { data } = await lookupInviteLink(code);
      if (cancelled) return;
      if (!data || data.status === 'not_found') {
        setLookup({ status: 'not_found' });
      } else if (data.status === 'expired') {
        setLookup({ status: 'expired' });
      } else {
        setLookup({ status: 'valid', team: data });
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  const handleJoin = async (forceLeave = false) => {
    if (!code) return;
    setPhase({ kind: 'redeeming' });
    const { data, error } = await redeemInviteLink(code, forceLeave);
    if (error || !data) {
      toast.error(friendlyError(error, 'Noe gikk galt. Prøv igjen.'));
      setPhase({ kind: 'idle' });
      return;
    }

    switch (data.status) {
      case 'joined':
        setPhase({ kind: 'joined' });
        return;
      case 'already_member':
        setPhase({ kind: 'already_member' });
        return;
      case 'own_team':
        setPhase({ kind: 'own_team' });
        return;
      case 'in_other_team': {
        // Fetch the leaving team's name for the confirm copy.
        let existingTeamName: string | null = null;
        if (data.existing_team_id) {
          const { data: t } = await supabase
            .from('teams')
            .select('name')
            .eq('id', data.existing_team_id)
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
        toast.error('Noe gikk galt. Prøv igjen.');
        setPhase({ kind: 'idle' });
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────

  if (lookup.status === 'loading' || !isInitialized) {
    return <Shell><div className="flex justify-center py-8"><Spinner size="lg" /></div></Shell>;
  }

  if (lookup.status === 'not_found') {
    return (
      <Shell>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-3">
          Lenken finnes ikke
        </h1>
        <p className="text-base text-foreground-muted">
          Sjekk at du har riktig lenke, eller be studioet om en ny.
        </p>
      </Shell>
    );
  }

  if (lookup.status === 'expired') {
    return (
      <Shell>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-3">
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
        <Cover url={team.team_cover_image_url} />
        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-3">
          Bli med i {team.team_name}
        </h1>
        <p className="text-base text-foreground-muted mb-8">
          Logg inn eller opprett en konto for å fortsette. Du blir tilbake hit etterpå.
        </p>
        <Button
          size="cta"
          className="w-full mb-2"
          onClick={() => navigate('/login', { state: { from: location } })}
        >
          Logg inn
        </Button>
        <Button
          variant="ghost"
          size="cta"
          className="w-full"
          onClick={() => navigate('/signup', { state: { from: location } })}
        >
          Opprett konto
        </Button>
      </Shell>
    );
  }

  // Already a member (either checked on redeem or pre-flight could check)
  if (phase.kind === 'already_member') {
    return (
      <Shell>
        <Cover url={team.team_cover_image_url} />
        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-3">
          Du er allerede med
        </h1>
        <p className="text-base text-foreground-muted mb-8">
          Du er allerede medlem av {team.team_name}.
        </p>
        <Button size="cta" className="w-full" onClick={() => navigate('/schedule')}>
          Til timeplanen
        </Button>
      </Shell>
    );
  }

  // Joined just now — success state
  if (phase.kind === 'joined') {
    return (
      <Shell>
        <Cover url={team.team_cover_image_url} />
        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-3">
          Velkommen til {team.team_name}
        </h1>
        <p className="text-base text-foreground-muted mb-8">
          Kursene dine vises nå på studio-siden deres.
        </p>
        <Button size="cta" className="w-full" onClick={() => navigate('/studio')}>
          Til Studio
        </Button>
      </Shell>
    );
  }

  // Self-affiliation guard
  if (phase.kind === 'own_team') {
    return (
      <Shell>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-3">
          Dette er ditt eget studio
        </h1>
        <p className="text-base text-foreground-muted mb-8">
          Du kan ikke bli medlem av ditt eget team.
        </p>
        <Button size="cta" className="w-full" onClick={() => navigate('/studio')}>
          Til Studio
        </Button>
      </Shell>
    );
  }

  // State 2 — in another team, need to confirm leave
  if (phase.kind === 'need_force_leave') {
    const leavingName = phase.existingTeamName ?? 'det forrige teamet';
    return (
      <Shell>
        <Cover url={team.team_cover_image_url} />
        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-3">
          Bli med i {team.team_name}
        </h1>
        <p className="text-base text-foreground-muted mb-6">
          Du kan være med i ett team om gangen. Blir du med her, forlater du:
        </p>
        <div className="border border-border rounded-md bg-surface p-4 mb-8 text-left">
          <div className="text-sm font-medium text-foreground">{leavingName}</div>
        </div>
        <Button
          size="cta"
          className="w-full"
          onClick={() => void handleJoin(true)}
        >
          Forlat og bli med
        </Button>
      </Shell>
    );
  }

  // State 1 — clean join (default for logged-in user, idle phase)
  return (
    <Shell>
      <Cover url={team.team_cover_image_url} />
      <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-3">
        Bli med i {team.team_name}
      </h1>
      <p className="text-base text-foreground-muted mb-8">
        Kursene dine vil vises på studio-siden deres.
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
