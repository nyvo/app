import { ErrorState } from '@/components/ui/error-state';
import { ImageField } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { SettingsRows, SettingsRow } from '@/components/teacher/SettingsRows';
import {
  AffiliationsSection,
  AffiliatesList,
  InviteLinkView,
} from '@/components/teacher/studio/AffiliationsSection';
import { EmbedCodeSection } from '@/components/teacher/studio/EmbedCodeSection';
import { DiscountCard, useDiscountField } from '@/pages/teacher/StudioPage';
import type { GuestHost, HostAffiliate } from '@/services/affiliations';
import type { Seller } from '@/types/database';
import { DevPage, PreviewSection } from './_kit';

/**
 * /dev/studio-preview — the real section components from /studio
 * (`src/pages/teacher/StudioPage.tsx`), fed mock/empty/loading/error props.
 * No hand-rolled markup.
 *
 * `StudioPage` itself is hook/context-driven (useAuth, useLocations, dirty-form
 * state) and isn't mountable outside the app — this preview instead targets its
 * two extractable, props-only section components:
 *
 *  - `AffiliationsSection` (Samarbeid) — the richest stateful section. Its
 *    guest/solo branch (`IndividualView`) is fully prop-driven off `host`, so
 *    that branch's med-data/tomt/laster states are shown live below. The
 *    "feil" state is rendered by `StudioPage` itself (not by
 *    `AffiliationsSection`) when the host fetch fails — mirrored here with the
 *    same real `ErrorState` composition.
 *  - Its studio/business branch (invite link + instructor list) fetches *and
 *    writes* to Supabase from inside `BusinessView`/`InviteLinkPanel`, so those
 *    stateful wrappers can't mount here. The two presentational pieces they
 *    render — `InviteLinkView` (the ready-link row) and `AffiliatesList` — are
 *    the real components fed mock data below, so the studio-side design is
 *    reviewable without any network call.
 *  - `EmbedCodeSection` (Nettsted) is shown once, briefly — the in-depth
 *    coverage lives in `/dev/embed-code-preview`.
 *
 * The "Studio-oppsett" block shows the shared `SettingsRows`/`SettingsRow`
 * layout with the Profil tab's own rows (Profilbilde/Navn/Nettadresse), since
 * that's the settings-row shape the Studio page actually uses.
 */

// Mock Seller row — only the fields the sections below read matter; the rest
// of the DB shape is filled with harmless defaults so the object type-checks
// as a full `Seller` without an `any` cast.
function mockSeller(overrides: Partial<Seller> = {}): Seller {
  return {
    id: 'mock-seller-id',
    name: 'Flow Studio',
    slug: 'flow-studio',
    email: null,
    logo_url: null,
    cover_image_url: null,
    default_course_image_url: null,
    operating_model: 'solo',
    organization_number: null,
    stripe_account_id: null,
    stripe_account_status: null,
    stripe_onboarding_complete: false,
    stripe_payouts_enabled: false,
    student_discount_percent: null,
    senior_discount_percent: null,
    subscription_cancel_at_period_end: false,
    subscription_current_period_end: null,
    subscription_customer_id: null,
    subscription_external_id: null,
    subscription_plan: 'free',
    subscription_provider: null,
    subscription_status: 'active',
    created_at: null,
    updated_at: null,
    closed_at: null,
    uses_integrated_payments: null,
    ...overrides,
  };
}

type HostStudio = GuestHost['host'];

const MOCK_HOST: HostStudio = {
  id: 'host-seller-id',
  slug: 'yoga-huset',
  name: 'Yogahuset',
  cover_image_url: null,
};

const MOCK_AFFILIATES: HostAffiliate[] = [
  { guest_seller_id: 'g1', guest: { id: 'g1', name: 'Ida Berg', logo_url: null } },
  { guest_seller_id: 'g2', guest: { id: 'g2', name: 'Markus Lund', logo_url: null } },
  { guest_seller_id: 'g3', guest: { id: 'g3', name: 'Sofie Aas', logo_url: null } },
];

/** The real DiscountCard + useDiscountField from StudioPage's Rabatter tab —
 *  one enabled (student, 20 %), one off, same intro line as the tab. */
function RabatterDemo() {
  const student = useDiscountField(20);
  const senior = useDiscountField(null);
  return (
    <div>
      <div className="max-w-xl">
        <h2 className="text-base font-medium text-foreground">Student- og pensjonistrabatt</h2>
        <p className="mt-1 max-w-prose text-pretty text-sm text-foreground-muted">
          Deltakeren velger rabatten selv i kassen. Openspot sjekker ikke om deltakeren faktisk
          er student eller pensjonist — det ansvaret ligger hos deg. Du ser hvem som har valgt
          rabatt i deltakerlisten.
        </p>
      </div>
      <div className="mt-5 max-w-xl space-y-3">
        <DiscountCard title="Studentrabatt" id="preview-discount-student" field={student} disabled={false} />
        <DiscountCard title="Pensjonistrabatt" id="preview-discount-senior" field={senior} disabled={false} />
      </div>
    </div>
  );
}

export default function StudioPreview() {
  return (
    <DevPage
      title="Studio"
      description="De ekte seksjonskomponentene fra /studio — AffiliationsSection og settingsrad-mønsteret — matet med mock-, tomt-, laster- og feil-props. Hele StudioPage er hook/context-drevet og lar seg ikke montere direkte; se den i appen på /studio."
    >
      <PreviewSection
        label="Rabatter — kort"
        description="Rabatter-fanens kort (ekte DiscountCard fra StudioPage): agendakort-grammatikken fra Timeplan, bryter + prosentfelt."
      >
        <RabatterDemo />
      </PreviewSection>

      <PreviewSection
        label="Samarbeid — med data"
        description="Solo-instruktør tilknyttet et studio. Ekte AffiliationsSection, guest-grenen (IndividualView), host satt til en aktiv tilkobling."
      >
        <AffiliationsSection seller={mockSeller()} host={MOCK_HOST} onHostChange={() => {}} />
      </PreviewSection>

      <PreviewSection
        label="Samarbeid — laster"
        description="host=undefined — samme tilstand som mens StudioPage venter på fetchGuestHost."
      >
        <AffiliationsSection seller={mockSeller()} host={undefined} onHostChange={() => {}} />
      </PreviewSection>

      <PreviewSection
        label="Samarbeid — tomt"
        description="host=null: raden vises (tittel + beskrivelse), men tilkoblingskortet uteblir. I appen er denne kombinasjonen i praksis ikke nåbar (fanen skjules helt før dette), men vist her for fullstendighet."
      >
        <AffiliationsSection seller={mockSeller()} host={null} onHostChange={() => {}} />
      </PreviewSection>

      <PreviewSection
        label="Samarbeid — feil"
        description="AffiliationsSection rendrer ikke selv en feiltilstand for gjeste-siden — StudioPage bytter den ut med denne ErrorState-en når host-fetchen feiler (host==='error'). Samme oppsett kopiert herfra."
      >
        <ErrorState title="Kunne ikke hente info" message="" onRetry={() => {}} />
      </PreviewSection>

      <PreviewSection
        label="Samarbeid — studio-visning (med data)"
        description="Studio-grenen: invitasjonslenke + instruktørliste. De ekte presentasjonskomponentene (InviteLinkView + AffiliatesList) matet med mock-data — samme oppsett BusinessView bygger, men uten Supabase-kallene wrapperne gjør."
      >
        <SettingsRows>
          <SettingsRow
            title="Inviter instruktører"
            description="Del lenken så instruktører kan vise de publiserte kursene sine på studiosiden din."
          >
            <InviteLinkView code="a1b2c3d4" onRegenerate={() => {}} regenerating={false} />
          </SettingsRow>
          <SettingsRow
            title="Instruktører"
            description="Instruktørene som viser kursene sine på studiosiden din."
          >
            <AffiliatesList affiliates={MOCK_AFFILIATES} loading={false} onRevoke={() => {}} />
          </SettingsRow>
        </SettingsRows>
      </PreviewSection>

      <PreviewSection
        label="Samarbeid — studio-visning (ingen instruktører ennå)"
        description="Tom instruktørliste — det en ny studio ser før noen har tatt i bruk invitasjonslenken."
      >
        <SettingsRows>
          <SettingsRow
            title="Instruktører"
            description="Instruktørene som viser kursene sine på studiosiden din."
          >
            <AffiliatesList affiliates={[]} loading={false} onRevoke={() => {}} />
          </SettingsRow>
        </SettingsRows>
      </PreviewSection>

      <PreviewSection
        label="Studio-oppsett (SettingsRows-layout)"
        description="Samme SettingsRows/SettingsRow-primitiv som Profil-fanen på /studio bruker, med et par representative rader."
      >
        <SettingsRows>
          <SettingsRow title="Profilbilde" description="Vises på studiosiden din.">
            <ImageField
              variant="avatar"
              value={null}
              onChange={() => {}}
              onRemove={() => {}}
              changeLabel="Endre"
              ariaLabel="Last opp profilbilde"
            />
          </SettingsRow>

          <SettingsRow title="Navn" description="Navnet kundene ser på studiosiden.">
            <Input defaultValue="Flow Studio" aria-label="Navn" />
          </SettingsRow>

          <SettingsRow title="Nettadresse" description="Den offentlige adressen til studiosiden din.">
            <InputGroup>
              <InputGroupAddon align="inline-start">openspot.no/</InputGroupAddon>
              <InputGroupInput defaultValue="flow-studio" aria-label="Nettadresse" />
            </InputGroup>
          </SettingsRow>
        </SettingsRows>
      </PreviewSection>

      <PreviewSection
        label="Nettsted — embed-kode"
        description="EmbedCodeSection, kort visning — dybdedekningen ligger i /dev/embed-code-preview."
      >
        <SettingsRows>
          <EmbedCodeSection slug="flow-studio" />
        </SettingsRows>
      </PreviewSection>
    </DevPage>
  );
}
