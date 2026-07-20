import { ImageField } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { SettingsRows, SettingsRow } from '@/components/teacher/SettingsRows';
import { EmbedCodeSection } from '@/components/teacher/studio/EmbedCodeSection';
import { DiscountCard, useDiscountField } from '@/pages/teacher/StudioPage';
import { DevPage, PreviewSection } from './_kit';

/**
 * /dev/studio-preview — the real section components from /studio
 * (`src/pages/teacher/StudioPage.tsx`), fed mock props. No hand-rolled markup.
 *
 * `StudioPage` itself is hook/context-driven (useAuth, dirty-form state) and
 * isn't mountable outside the app — this preview targets its extractable
 * pieces:
 *
 *  - `DiscountCard` + `useDiscountField` (Rabatter tab).
 *  - The shared `SettingsRows`/`SettingsRow` layout with the Profil tab's
 *    representative rows (Profilbilde/Navn/Nettadresse).
 *  - `EmbedCodeSection` (shown once, briefly — depth in /dev/embed-code-preview).
 *
 * Samarbeid moved to its own page — see /dev/samarbeid-preview.
 */

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
          Deltakeren velger rabatten selv i kassen. UpNext sjekker ikke om deltakeren faktisk
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
      description="De ekte seksjonskomponentene fra /studio — Rabatter-kortene og settingsrad-mønsteret. Samarbeid har egen side; se /dev/samarbeid-preview."
    >
      <PreviewSection
        label="Rabatter — kort"
        description="Rabatter-fanens kort (ekte DiscountCard fra StudioPage): agendakort-grammatikken fra Timeplan, bryter + prosentfelt."
      >
        <RabatterDemo />
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
              <InputGroupAddon align="inline-start">upnext.no/</InputGroupAddon>
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
