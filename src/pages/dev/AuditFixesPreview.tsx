import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, Clock, MapPin, UserPlus } from '@/lib/icons';

/**
 * Before/after gallery for the 2026-07-10 design-audit recommendations
 * (.context/audit/DESIGN-AUDIT.md §B/§C), updated after sign-off:
 * items 1 (Timeplan), 4 (empty chart) and 7 (embed calendar) were declined —
 * current behavior kept; items 2, 5, 6 and 8 are implemented in product code;
 * item 3 (notification plates) is still open — this page shows all three row
 * states so the read state can be judged alongside unread/action-required.
 * Panels are built strictly from existing tokens/primitives.
 */
const AuditFixesPreview = () => {
  return (
    <div className="min-h-screen bg-canvas text-foreground py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
        <header className="space-y-1">
          <h1 className="text-2xl font-medium">Designaudit — foreslåtte endringer</h1>
          <p className="text-sm text-foreground-muted max-w-2xl">
            Oppdatert etter gjennomgang: punkt 1, 4 og 7 beholdes som i dag.
            Punkt 2, 3, 5 og 8 er implementert. Punkt 6 utgikk — storefronten
            ble redesignet i parallell (StudioAgendaList) med pris i fast kolonne.
          </p>
        </header>

        <CompareSection
          title="2 · Kurs-listen — «Fullt»-status + høyrestilte tall"
          status="implementert"
          note="Fullbooket er et godt tegn for læreren — grønn success-badge, ikke advarsel. Tallkolonnene (Påmeldte/Pris) er høyrestilt med luft mot hover-chevronen. Badgen vises kun for aktive/kommende kurs; utkast/avlyst/fullført beholder sin publiseringsstatus."
          beforeLabel="Før"
          afterLabel="Nå (implementert)"
          before={
            <div>
              <CourseTableHeader align="left" />
              <CourseRow title="Vinyasa Flow — Mandager" kind="Kursrekke" status={null} signups="3 / 3" price="2 400 kr" align="left" />
              <CourseRow title="Lunsj-yoga — Open Flow" kind="Kursrekke" status={null} signups="6 / 18" price="1 400 kr" align="left" />
            </div>
          }
          after={
            <div>
              <CourseTableHeader align="right" />
              <CourseRow
                title="Vinyasa Flow — Mandager"
                kind="Kursrekke"
                status={<Badge variant="success" shape="pill" size="sm">Fullt</Badge>}
                signups="3 / 3"
                price="2 400 kr"
                align="right"
              />
              <CourseRow title="Lunsj-yoga — Open Flow" kind="Kursrekke" status={null} signups="6 / 18" price="1 400 kr" align="right" />
            </div>
          }
        />

        <CompareSection
          title="3 · Varsler — mørk plate kun når handling kreves"
          status="implementert"
          note="Mørk plate er reservert for uleste action_required-rader; uleste informasjonsrader får dempet plate men beholder mørk tittel (tittelvekten bærer «ulest»); leste rader dempes helt som før. Kroppsteksten viser nå komma i stedet for «·» — byttet gjøres i visningslaget (format-body.ts), fordi « · » i databasen er parse-skilletegnet PII-redigeringen ved kontosletting regex-matcher på."
          beforeLabel="Før"
          afterLabel="Nå (implementert)"
          before={
            <div className="divide-y divide-border-subtle">
              <NotifRow plate="dark" icon={<Bell className="size-4" />} title="Utbetaling krever handling" sub="Bekreft kontonummer for å motta oppgjør" time="nå" />
              <NotifRow plate="dark" icon={<UserPlus className="size-4" />} title="Ny påmelding" sub="Alma Solheim, Gratis Prøvetime" time="nå" />
              <NotifRow plate="muted" dimmed icon={<UserPlus className="size-4" />} title="Ny påmelding" sub="Iben Strand, Yin Yoga" time="i går" />
            </div>
          }
          after={
            <div className="divide-y divide-border-subtle">
              <NotifRow plate="dark" icon={<Bell className="size-4" />} title="Utbetaling krever handling" sub="Bekreft kontonummer for å motta oppgjør" time="nå" />
              <NotifRow plate="muted" icon={<UserPlus className="size-4" />} title="Ny påmelding" sub="Alma Solheim, Gratis Prøvetime" time="nå" />
              <NotifRow plate="muted" dimmed icon={<UserPlus className="size-4" />} title="Ny påmelding" sub="Iben Strand, Yin Yoga" time="i går" />
            </div>
          }
          beforeCaption="Handling, ulest og lest — før"
          afterCaption="Handling, ulest og lest — nå"
        />

        <CompareSection
          title="5 · Deaktiverte primærknapper — dempet fyll i stedet for 50 % svart"
          status="implementert"
          note="Gjelder nå alle Button-varianter: teksten faller til foreground-disabled, og fylte varianter (default/destructive) flater til bg-muted. Forskjellen fra secondary: samme fyll, men secondary har full-kontrast tekst og hover/press-respons — en deaktivert knapp har blek tekst og reagerer ikke."
          beforeLabel="Før"
          afterLabel="Nå (implementert)"
          before={
            <div className="flex flex-col items-start gap-3">
              <span className="inline-flex h-11 w-64 items-center justify-center rounded-full bg-foreground text-sm font-medium text-background opacity-50">
                Fortsett
              </span>
              <span className="text-xs text-foreground-muted">disabled:opacity-50 (tidligere)</span>
            </div>
          }
          after={
            <div className="flex flex-col items-start gap-3">
              <Button disabled className="w-64">Fortsett</Button>
              <div className="flex items-center gap-3">
                <Button variant="secondary" className="w-40">Avbryt</Button>
                <span className="text-xs text-foreground-muted">secondary til sammenligning</span>
              </div>
            </div>
          }
        />

        <CompareSection
          title="6 · Storefront — avlyst økt viser ikke pris"
          status="utgått"
          note="Utgått: storefronten ble redesignet i en annen arbeidsflate (StudioAgendaList, ClassPass-grammatikk) mens dette var underveis. Den nye radkontrakten har fem faste kolonner der prisen alltid rendres — også på fulle/avlyste rader — for kolonnejustering. Endringen ble derfor droppet i merge; ta den opp mot den nye komponenten hvis ønsket."
          beforeLabel="Gammel komponent"
          afterLabel="Forslaget (ikke videreført)"
          before={<CancelledRow showPrice />}
          after={<CancelledRow showPrice={false} />}
        />

        <CompareSection
          title="8 · Passordregler — konstant sjekkmerke, farge bærer tilstanden"
          status="implementert"
          note="Oppfylt-tilstanden fylte allerede sirkelen med sjekkmerke — problemet var at tom ring lignet en radioknapp. Mobbin-konsensus (Rocket Money, Kraken, Spotify, OKX) er et konstant sjekkmerke: blekt i uthulet sirkel når regelen mangler, fylt grønt når oppfylt."
          beforeLabel="Før"
          afterLabel="Nå (implementert)"
          before={
            <ul className="space-y-2 text-sm">
              <OldRule met>Minst 8 tegn</OldRule>
              <OldRule met={false}>Minst ett tall</OldRule>
              <OldRule met={false}>Minst ett spesialtegn</OldRule>
            </ul>
          }
          after={
            <ul className="space-y-2 text-sm">
              <NewRule met>Minst 8 tegn</NewRule>
              <NewRule met={false}>Minst ett tall</NewRule>
              <NewRule met={false}>Minst ett spesialtegn</NewRule>
            </ul>
          }
        />
      </div>
    </div>
  );
};

/* ── Shell ─────────────────────────────────────────────────────────── */

function CompareSection({
  title,
  status,
  note,
  before,
  after,
  beforeLabel = 'Nå',
  afterLabel = 'Forslag',
  beforeCaption,
  afterCaption,
}: {
  title: string;
  status: 'implementert' | 'til vurdering' | 'utgått';
  note: string;
  before: ReactNode;
  after: ReactNode;
  beforeLabel?: string;
  afterLabel?: string;
  beforeCaption?: string;
  afterCaption?: string;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-medium">{title}</h2>
          <Badge
            variant={status === 'implementert' ? 'success' : status === 'utgått' ? 'neutral' : 'info'}
            shape="pill"
            size="sm"
          >
            {status === 'implementert' ? 'Implementert' : status === 'utgått' ? 'Utgått' : 'Til vurdering'}
          </Badge>
        </div>
        <p className="text-sm text-foreground-muted max-w-3xl">{note}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ComparePanel label={beforeLabel} caption={beforeCaption}>{before}</ComparePanel>
        <ComparePanel label={afterLabel} caption={afterCaption}>{after}</ComparePanel>
      </div>
    </section>
  );
}

function ComparePanel({ label, caption, children }: { label: string; caption?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-foreground-muted">{label}</span>
        {caption && <span className="text-xs text-foreground-muted">{caption}</span>}
      </div>
      {children}
    </div>
  );
}

/* ── 2 · Kurs table mocks ──────────────────────────────────────────── */

function CourseTableHeader({ align }: { align: 'left' | 'right' }) {
  const num = align === 'right' ? 'text-right' : 'text-left';
  return (
    <div className="grid grid-cols-[1fr_6rem_6rem_6rem] gap-4 border-b border-border pb-2 text-sm text-foreground-muted">
      <span>Navn</span>
      <span>Status</span>
      <span className={num}>Påmeldte</span>
      <span className={num}>Pris</span>
    </div>
  );
}

function CourseRow({
  title,
  kind,
  status,
  signups,
  price,
  align,
}: {
  title: string;
  kind: string;
  status: ReactNode;
  signups: string;
  price: string;
  align: 'left' | 'right';
}) {
  const num = align === 'right' ? 'text-right' : 'text-left';
  return (
    <div className="grid grid-cols-[1fr_6rem_6rem_6rem] items-center gap-4 border-b border-border-subtle py-4">
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-foreground-muted">
          <span className="size-2 rounded-full bg-info" aria-hidden="true" />
          {kind}
        </p>
      </div>
      <div>{status}</div>
      <span className={`text-sm tabular-nums ${num}`}>{signups}</span>
      <span className={`text-sm tabular-nums ${num}`}>{price}</span>
    </div>
  );
}

/* ── 3 · Notification mocks ────────────────────────────────────────── */

function NotifRow({
  plate,
  dimmed,
  icon,
  title,
  sub,
  time,
}: {
  plate: 'dark' | 'muted';
  dimmed?: boolean;
  icon: ReactNode;
  title: string;
  sub: string;
  time: string;
}) {
  return (
    <div className="grid grid-cols-[32px_1fr_auto] items-start gap-3 py-2.5">
      <div
        className={`flex size-8 items-center justify-center rounded-lg ${
          plate === 'dark' ? 'bg-foreground text-background' : 'bg-muted text-foreground-muted'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-sm ${dimmed ? 'text-foreground-muted' : 'font-medium text-foreground'}`}>{title}</p>
        <p className="truncate text-sm text-foreground-muted">{sub}</p>
      </div>
      <span className="text-xs text-foreground-muted tabular-nums">{time}</span>
    </div>
  );
}

/* ── 6 · Storefront cancelled row ──────────────────────────────────── */

function CancelledRow({ showPrice }: { showPrice: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-lg font-medium">Gratis prøvetime — Pust og ro</p>
        <p className="mt-1 flex items-center gap-4 text-sm text-foreground-muted">
          <span className="flex items-center gap-1.5"><Clock className="size-3.5" />06:00–07:00</span>
          <span className="flex items-center gap-1.5"><MapPin className="size-3.5" />Karl Johans gt. 22</span>
        </p>
      </div>
      <div className={`flex flex-col items-end self-stretch ${showPrice ? 'justify-between gap-2' : 'justify-center'}`}>
        {showPrice && <span className="text-base font-medium">Gratis</span>}
        <span className="inline-flex h-8 items-center rounded-full bg-muted px-3 text-sm font-medium text-foreground-muted">
          Avlyst
        </span>
      </div>
    </div>
  );
}

/* ── 8 · Password rules ────────────────────────────────────────────── */

function OldRule({ met, children }: { met: boolean; children: ReactNode }) {
  return (
    <li className={`flex items-center gap-2.5 ${met ? 'text-foreground' : 'text-foreground-muted'}`}>
      <span
        aria-hidden="true"
        className={`flex size-4 items-center justify-center rounded-full border ${
          met ? 'border-foreground bg-foreground' : 'border-border'
        }`}
      >
        {met && <Check className="size-2.5 text-background" strokeWidth={3} />}
      </span>
      {children}
    </li>
  );
}

function NewRule({ met, children }: { met: boolean; children: ReactNode }) {
  return (
    <li className={`flex items-center gap-2.5 ${met ? 'text-foreground' : 'text-foreground-muted'}`}>
      <span
        aria-hidden="true"
        className={`flex size-4 items-center justify-center rounded-full border ${
          met ? 'border-success bg-success' : 'border-border'
        }`}
      >
        <Check className={`size-2.5 ${met ? 'text-background' : 'text-foreground-disabled'}`} strokeWidth={3} />
      </span>
      {children}
    </li>
  );
}

export default AuditFixesPreview;
