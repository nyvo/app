import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Upload } from '@/lib/icons';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SegmentedTabs } from '@/components/teacher/SegmentedTabs';
import { CourseDetailContent } from '@/components/public/course-details/CourseDetailContent';
import { cn, formatKroner } from '@/lib/utils';
import { DevPage, PreviewSection } from './_kit';
import { makeMockCourse, makeMockSessions } from './DetailT1Preview';

/**
 * /dev/course-builder-concepts — three *exploratory* directions for the create
 * course page, built from real primitives + tokens (not the shipped
 * CreateCourseDrawer). Mock data, lightly interactive. For choosing a direction,
 * not production. References (structure only, re-skinned to our system):
 *  A — split live-preview: Retool / HubSpot / Biosites form-builders.
 *  B — guided wizard: ElevenLabs / Airtasker; reuses our payout step-rail.
 *  C — form + companion checklist: Snowflake publishing guide / Airtasker tips.
 */

type FormatType = 'single' | 'series';

export const FORMAT_TABS: { key: FormatType; label: string }[] = [
  { key: 'single', label: 'Enkelttime' },
  { key: 'series', label: 'Kursrekke' },
];

// ── Shared bits ────────────────────────────────────────────────────────────

export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description && <p className="text-sm text-foreground-muted">{description}</p>}
    </div>
  );
}

export function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** Mock cover dropzone — a short banner, matching the shipped ImageField look. */
export function CoverDrop({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={cn(
        'flex aspect-[3/1] w-full flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface text-center outline-none transition-colors hover:border-border-strong hover:bg-hover',
        className,
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground">
        <Upload className="size-5" />
      </span>
      <span className="max-w-64 text-sm text-foreground-muted">
        Dra bildet hit, eller klikk for å laste opp.
      </span>
    </button>
  );
}

/**
 * Live preview = the REAL public course page (`CourseDetailContent`), fed the
 * same mock the /dev/detail-t1-preview uses, with the form's title/price
 * overlaid — scaled into a device frame so the split fits. Price + CTA live in
 * the real page's separate `BookingBar`, represented here by the static footer.
 */
function LiveKursidePreview({ title, price }: { title: string; price: number }) {
  const base = useMemo(() => makeMockCourse('normal'), []);
  const course = { ...base, title: title || base.title, price };
  const sessions = useMemo(() => makeMockSessions(base.id, 'normal'), [base.id]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-soft">
      <div className="relative h-[440px] overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{ width: 640, transform: 'scale(0.625)' }}
        >
          <CourseDetailContent course={course} sessions={sessions} backHref="#" />
        </div>
      </div>
      {/* The real page's price + CTA live in a persistent BookingBar (separate
          component); shown here statically so the preview reads complete. */}
      <div className="flex items-center justify-between border-t border-border-subtle px-4 py-3">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wide text-foreground-muted">Hele kurset</span>
          <span className="text-base font-medium tabular-nums text-foreground">
            {formatKroner(price)}
          </span>
        </div>
        <Button>Meld deg på</Button>
      </div>
    </div>
  );
}

// ── Concept A — split live-preview ───────────────────────────────────────────

function ConceptSplit() {
  const [title, setTitle] = useState('Morgenyoga');
  const [price, setPrice] = useState('350');
  const [format, setFormat] = useState<FormatType>('single');

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0 space-y-8">
        <div className="space-y-3">
          <SectionHeader title="Forsidebilde" description="Vises øverst på kurssiden." />
          <CoverDrop />
        </div>

        <div className="space-y-3">
          <SectionHeader title="Type" description="Enkelttime for én økt, eller kursrekke over flere uker." />
          <SegmentedTabs<FormatType>
            value={format}
            onChange={setFormat}
            tabs={FORMAT_TABS}
            ariaLabel="Type"
            role="radiogroup"
            stretch
          />
        </div>

        <section className="space-y-5 border-t border-border-subtle pt-8">
          <SectionHeader title="Om kurset" description="Tittel og beskrivelse deltakerne ser." />
          <FieldRow label="Tittel">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </FieldRow>
          <FieldRow label="Beskrivelse">
            <Textarea rows={4} placeholder="Beskriv hva deltakerne lærer …" />
          </FieldRow>
        </section>

        <section className="space-y-5 border-t border-border-subtle pt-8">
          <SectionHeader title="Hvor og pris" description="Prisen er total og trekkes ved påmelding." />
          <FieldRow label="Sted">
            <Input defaultValue="Flow Studio, Oslo" />
          </FieldRow>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldRow label="Antall plasser">
              <Input defaultValue="12" inputMode="numeric" />
            </FieldRow>
            <FieldRow label="Pris">
              <div className="relative">
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  inputMode="numeric"
                  className="pr-10 tabular-nums"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base text-foreground-muted">
                  kr
                </span>
              </div>
            </FieldRow>
          </div>
        </section>
      </div>

      <aside className="h-fit lg:sticky lg:top-6">
        <p className="mb-3 text-sm font-medium text-foreground-muted">Slik ser kurssiden ut</p>
        <LiveKursidePreview title={title} price={Number(price) || 0} />
      </aside>
    </div>
  );
}

// ── Concept B — guided wizard (left step-rail) ───────────────────────────────

export const WIZARD_STEPS = ['Type', 'Om kurset', 'Når', 'Hvor og pris', 'Se over'];

function WizardMarker({ status, index }: { status: 'done' | 'current' | 'upcoming'; index: number }) {
  if (status === 'done') {
    return (
      <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-success-subtle text-success">
        <Check className="size-3.5" aria-hidden />
      </span>
    );
  }
  return (
    <span
      className={cn(
        'flex size-[26px] shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums',
        status === 'current' ? 'bg-muted text-foreground' : 'bg-muted text-foreground-muted',
      )}
    >
      {index + 1}
    </span>
  );
}

/** The numbered step rail — shared by the concept card and the full-page wizard. */
export function WizardRail({ step, onSelect }: { step: number; onSelect: (i: number) => void }) {
  return (
    <ol className="shrink-0 sm:pr-10">
      {WIZARD_STEPS.map((s, i) => {
        const status = i < step ? 'done' : i === step ? 'current' : 'upcoming';
        const isLast = i === WIZARD_STEPS.length - 1;
        return (
          <li key={s} className="grid grid-cols-[26px_1fr] gap-x-3">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-label={s}
                className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <WizardMarker status={status} index={i} />
              </button>
              {!isLast && (
                <span
                  aria-hidden
                  className={cn('my-1 w-px flex-1', status === 'done' ? 'bg-success' : 'bg-border-subtle')}
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => onSelect(i)}
              className="pb-6 pt-[3px] text-left outline-none"
            >
              <p
                className={cn(
                  'text-base leading-normal',
                  status === 'current' ? 'font-medium text-foreground' : 'font-normal text-foreground-muted',
                )}
              >
                {s}
              </p>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** The fields for a given step — shared by the concept card and the full page. */
export function WizardStepFields({ step }: { step: number }) {
  const [format, setFormat] = useState<FormatType>('single');
  return (
    <div className="space-y-5">
      {step === 0 && (
        <SegmentedTabs<FormatType>
          value={format}
          onChange={setFormat}
          tabs={FORMAT_TABS}
          ariaLabel="Type"
          role="radiogroup"
          stretch
        />
      )}
      {step === 1 && (
        <>
          <FieldRow label="Tittel">
            <Input defaultValue="Morgenyoga" />
          </FieldRow>
          <FieldRow label="Beskrivelse">
            <Textarea rows={4} placeholder="Beskriv hva deltakerne lærer …" />
          </FieldRow>
        </>
      )}
      {step === 2 && (
        <>
          <FieldRow label="Dato">
            <Input defaultValue="8. juli 2026" />
          </FieldRow>
          <FieldRow label="Tidspunkt">
            <Input defaultValue="06:00–07:00" />
          </FieldRow>
        </>
      )}
      {step === 3 && (
        <>
          <FieldRow label="Sted">
            <Input defaultValue="Flow Studio, Oslo" />
          </FieldRow>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldRow label="Antall plasser">
              <Input defaultValue="12" inputMode="numeric" />
            </FieldRow>
            <FieldRow label="Pris">
              <Input defaultValue="350" inputMode="numeric" className="tabular-nums" />
            </FieldRow>
          </div>
        </>
      )}
      {step === 4 && (
        <div className="divide-y divide-border-subtle rounded-xl border border-border bg-surface">
          {[
            ['Type', 'Enkelttime'],
            ['Tittel', 'Morgenyoga'],
            ['Når', 'Ons 8. juli, 06:00–07:00'],
            ['Sted', 'Flow Studio, Oslo'],
            ['Pris', '350 kr'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <span className="text-foreground-muted">{k}</span>
              <span className="font-medium text-foreground">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConceptWizard() {
  const [step, setStep] = useState(1);

  return (
    <div className="grid gap-8 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-0">
      <WizardRail step={step} onSelect={setStep} />
      <div className="min-w-0 sm:border-l sm:border-border-subtle sm:pl-10">
        <WizardStepFields step={step} />
        <div className="mt-8 flex items-center justify-between border-t border-border-subtle pt-4">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            <ArrowLeft className="size-4" aria-hidden />
            Tilbake
          </Button>
          {step < WIZARD_STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1))}>
              Neste
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button>Publiser</Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Concept C — form + companion checklist ───────────────────────────────────

function ChecklistItem({ done, children }: { done?: boolean; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full',
          done ? 'bg-success-subtle text-success' : 'border border-border-subtle bg-surface',
        )}
      >
        {done && <Check className="size-3" aria-hidden />}
      </span>
      <span className={done ? 'text-foreground-muted' : 'text-foreground'}>{children}</span>
    </li>
  );
}

function ConceptGuide() {
  const [format, setFormat] = useState<FormatType>('single');

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 divide-y divide-border-subtle">
        <div className="space-y-8 pb-8">
          <div className="space-y-3">
            <SectionHeader title="Forsidebilde" description="Vises øverst på kurssiden." />
            <CoverDrop />
          </div>
          <div className="space-y-3">
            <SectionHeader title="Type" description="Enkelttime for én økt, eller kursrekke over flere uker." />
            <SegmentedTabs<FormatType>
              value={format}
              onChange={setFormat}
              tabs={FORMAT_TABS}
              ariaLabel="Type"
              role="radiogroup"
              stretch
            />
          </div>
        </div>

        <section className="space-y-5 py-8">
          <SectionHeader title="Om kurset" description="Tittel og beskrivelse deltakerne ser." />
          <FieldRow label="Tittel">
            <Input defaultValue="Morgenyoga" />
          </FieldRow>
          <FieldRow label="Beskrivelse">
            <Textarea rows={4} placeholder="Beskriv hva deltakerne lærer …" />
          </FieldRow>
        </section>

        <section className="space-y-5 pt-8">
          <SectionHeader title="Hvor og pris" description="Prisen er total og trekkes ved påmelding." />
          <FieldRow label="Sted">
            <Input defaultValue="Flow Studio, Oslo" />
          </FieldRow>
        </section>
      </div>

      <aside className="h-fit space-y-4 lg:sticky lg:top-6">
        <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
          <p className="text-sm font-medium text-foreground">Før du publiserer</p>
          <ul className="space-y-3">
            <ChecklistItem done>Forsidebilde</ChecklistItem>
            <ChecklistItem done>Tittel og beskrivelse</ChecklistItem>
            <ChecklistItem>Dato og tidspunkt</ChecklistItem>
            <ChecklistItem>Sted og pris</ChecklistItem>
          </ul>
        </div>
        <div className="rounded-xl bg-panel p-4">
          <p className="text-sm font-medium text-foreground">Tips</p>
          <p className="mt-1 text-sm text-foreground-muted">
            Et lyst forsidebilde som viser stemningen gir flest påmeldinger.
          </p>
        </div>
      </aside>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CourseBuilderConceptsPreview() {
  return (
    <DevPage
      title="Kursbygger — konsepter"
      description="Tre retninger for opprett-kurs-siden, bygget med ekte primitiver og tokens. Mock-data, lett interaktive. For å velge retning — ikke produksjon."
    >
      <PreviewSection
        label="A — Delt visning med live forhåndsvisning"
        description="Skjema til venstre, kurssiden bygger seg fram til høyre (skriv i Tittel/Pris). Retool/HubSpot/Biosites-mønsteret, reskinnet til vårt system."
      >
        <ConceptSplit />
      </PreviewSection>

      <PreviewSection
        label="B — Veiviser (steg for steg)"
        description="Nummerert steg-skinne til venstre (samme som utbetalinger), ett steg om gangen i midten. Klikk stegene. ElevenLabs/Airtasker-mønsteret."
      >
        <ConceptWizard />
      </PreviewSection>

      <PreviewSection
        label="C — Skjema med sjekkliste-panel"
        description="Seksjonert skjema på lerretet, med et fast følgepanel: sjekkliste før publisering + ett tips. Snowflake/Airtasker-mønsteret."
      >
        <ConceptGuide />
      </PreviewSection>
    </DevPage>
  );
}
