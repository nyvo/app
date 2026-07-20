import {
  InstructorTable,
  GuestConnectedSection,
  GuestInvitationSection,
  GuestEmptySection,
} from '@/pages/teacher/SamarbeidPage';
import { ErrorState } from '@/components/ui/error-state';
import type { GuestHost, HostAffiliate } from '@/services/affiliations';
import type { ReceivedInvitation, SellerInvitation } from '@/services/invitations';
import { DevPage, PreviewSection } from './_kit';

/**
 * /dev/samarbeid-preview — the real section components from /samarbeid
 * (`src/pages/teacher/SamarbeidPage.tsx`), fed mock/empty/loading props.
 * No hand-rolled markup.
 *
 * Studio (host) side — `InstructorTable`: the Navn/Rolle table with the
 * studio as Eier row, active instructors (UserAvatar: photo → else
 * silhouette), pending email invitations (silhouette + «Invitert {dato}»),
 * the quiet-row empty state and the loading skeleton. Row menus are the real
 * DropdownMenus (Fjern fra studiosiden / Send på nytt / Fjern) — actions are
 * mocked no-ops here.
 *
 * Solo (guest) side — the state-bearing sections: `GuestInvitationSection`
 * (Godta/Avslå — the buttons call the real accept/decline RPCs, which fail
 * politely against the mock token), `GuestConnectedSection` (menu with Se
 * studiosiden / Stopp visning) and `GuestEmptySection`.
 *
 * The page-level error state (hydrate/fetch failure) is StudioPage-style
 * `ErrorState`, mirrored here with the same composition.
 */

const MOCK_AFFILIATES: HostAffiliate[] = [
  {
    guest_seller_id: 'g1',
    created_at: '2026-07-12T10:00:00Z',
    guest: { id: 'g1', name: 'Ida Berg', slug: 'ida-berg', logo_url: null },
  },
  {
    guest_seller_id: 'g2',
    created_at: '2026-06-28T10:00:00Z',
    guest: { id: 'g2', name: 'Markus Lund', slug: 'markus-lund', logo_url: null },
  },
];

const MOCK_INVITATIONS: SellerInvitation[] = [
  {
    id: 'i1',
    host_seller_id: 'host-1',
    email: 'sofie.aas@gmail.com',
    status: 'pending',
    created_at: '2026-07-18T10:00:00Z',
    expires_at: '2026-08-17T10:00:00Z',
  },
];

const MOCK_HOST: GuestHost = {
  host_seller_id: 'host-1',
  created_at: '2026-07-12T10:00:00Z',
  host: { id: 'host-1', slug: 'yoga-huset', name: 'Yogahuset', logo_url: null },
};

const MOCK_RECEIVED: ReceivedInvitation = {
  id: 'i2',
  host_seller_id: 'host-1',
  email: 'meg@eksempel.no',
  token: 'mock-token',
  status: 'pending',
  created_at: '2026-07-18T10:00:00Z',
  expires_at: '2026-08-17T10:00:00Z',
  host: { id: 'host-1', name: 'Yogahuset', slug: 'yoga-huset', logo_url: null },
};

const noop = () => {};

export default function SamarbeidPreview() {
  return (
    <DevPage
      title="Samarbeid"
      description="De ekte seksjonskomponentene fra /samarbeid — InstructorTable (studio) og gjeste-seksjonene (solo) — matet med mock-, tomt- og laster-props. Hele SamarbeidPage er context-drevet; se den i appen på /samarbeid."
    >
      <PreviewSection
        label="Studio — med instruktører og én ventende invitasjon"
        description="Navn/Rolle-tabellen: eier-raden øverst, aktive instruktører med «Ble med»-dato, ventende e-postinvitasjon med silhuett-avatar. Radmenyene er ekte (mock-handlinger)."
      >
        <InstructorTable
          ownerName="Flow Studio"
          ownerLogoUrl={null}
          affiliates={MOCK_AFFILIATES}
          invitations={MOCK_INVITATIONS}
          onRevokeAffiliate={noop}
          onResendInvitation={noop}
          onRevokeInvitation={noop}
        />
      </PreviewSection>

      <PreviewSection
        label="Studio — ingen instruktører ennå"
        description="Tomtilstanden er en stille tabellrad — strukturen består, eier-raden viser at teamet finnes."
      >
        <InstructorTable
          ownerName="Flow Studio"
          ownerLogoUrl={null}
          affiliates={[]}
          invitations={[]}
          onRevokeAffiliate={noop}
          onResendInvitation={noop}
          onRevokeInvitation={noop}
        />
      </PreviewSection>

      <PreviewSection
        label="Studio — laster"
        description="affiliates/invitations = null — skjelettrader under eier-raden."
      >
        <InstructorTable
          ownerName="Flow Studio"
          ownerLogoUrl={null}
          affiliates={null}
          invitations={null}
          onRevokeAffiliate={noop}
          onResendInvitation={noop}
          onRevokeInvitation={noop}
        />
      </PreviewSection>

      <PreviewSection
        label="Solo — invitasjon mottatt"
        description="GuestInvitationSection: overskriften bærer tilstanden, raden har Avslå/Godta. Knappene kaller de ekte RPC-ene og feiler høflig mot mock-tokenet."
      >
        <div className="max-w-xl">
          <GuestInvitationSection invitation={MOCK_RECEIVED} onChanged={noop} />
        </div>
      </PreviewSection>

      <PreviewSection
        label="Solo — tilknyttet"
        description="GuestConnectedSection: «Kursene dine vises hos …», statusdot + dato, radmeny med Se studiosiden / Stopp visning."
      >
        <div className="max-w-xl">
          <GuestConnectedSection sellerId="mock-seller" host={MOCK_HOST} onLeft={noop} />
        </div>
      </PreviewSection>

      <PreviewSection
        label="Solo — ikke tilknyttet"
        description="GuestEmptySection: tomtilstanden som stille panelrad."
      >
        <div className="max-w-xl">
          <GuestEmptySection />
        </div>
      </PreviewSection>

      <PreviewSection
        label="Feil — kontoinformasjon / henting"
        description="Sidenivå-feilene rendres av SamarbeidPage med denne ErrorState-komposisjonen (hydrate-feil viser retry i stedet for å gjette kontotype)."
      >
        <ErrorState
          title="Kunne ikke hente kontoinformasjon"
          message="Prøv igjen om litt."
          onRetry={noop}
        />
      </PreviewSection>
    </DevPage>
  );
}
