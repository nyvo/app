import { Link } from 'react-router-dom';

/**
 * `/dev` hub — the index for every live component preview. Grouped by product
 * area. Each entry renders REAL production components in their default / empty
 * / error / loading states. DEV-only (the whole `/dev/*` block is tree-shaken
 * out of production builds).
 */

interface PreviewLink {
  label: string;
  to: string;
  blurb: string;
}

interface PreviewGroup {
  title: string;
  items: PreviewLink[];
}

const GROUPS: PreviewGroup[] = [
  {
    title: 'Grunnlag',
    items: [
      { label: 'Design tokens', to: '/dev/tokens', blurb: 'Semantiske farger, tekst-tiers, kanter, radius og typografi — live fra index.css.' },
      { label: 'Primitiver', to: '/dev/primitives', blurb: 'Knapper, merker, dialoger, ConfirmDialog, paneler og toasts — ekte komponenter.' },
      { label: 'Tilstander', to: '/dev/states', blurb: 'PageState, EmptyState, ErrorState og Skeleton — alle delte tomme/feil/laste-byggeklosser.' },
      { label: 'Innstillinger-rader', to: '/dev/settings-rows-preview', blurb: 'SettingsRows-layoutmønsteret som innstillingssidene bygger på.' },
      { label: 'DirtyFormBar', to: '/dev/dirty-bar-preview', blurb: 'Flytende «ulagrede endringer»-pill — bred rad og kun knapper; feil vises som toast.' },
    ],
  },
  {
    title: 'Selger — dashboard & daglig',
    items: [
      { label: 'Oversikt (dashboard)', to: '/dev/dashboard-preview', blurb: 'Inntektsgraf + kommende kurs + siste påmeldinger. Pro / Start / tomt / laster / feil.' },
      { label: 'Inntektsgraf', to: '/dev/income-chart-preview', blurb: 'IncomeChart med data, tomt og lasting — uke/måned/år.' },
      { label: 'Mine kurs', to: '/dev/courses-list-preview', blurb: 'CourseListView med kurs, tomt, lasting, tellinger utilgjengelig og feil.' },
      { label: 'Kursbygger', to: '/dev/course-builder-live', blurb: 'Ekte CreateCourseDrawer montert uten innlogging.' },
      { label: 'Kursbygger — konsepter', to: '/dev/course-builder-concepts', blurb: 'Tre retninger: delt live-visning, veiviser, sjekkliste-panel.' },
      { label: 'Kursbygger — drawer', to: '/dev/course-builder-wizard', blurb: 'Opprett kurs i en drawer — seksjonert skjema med skillelinjer, lettvekt.' },
      { label: 'Kursoversikt', to: '/dev/draft-experience-preview', blurb: 'Oversikt-fanen gjennom kursets livssyklus (utkast → publisert).' },
      { label: 'Timeplan', to: '/dev/schedule-preview', blurb: 'TimelineDay + SessionCard — agenda med data, tomt og feil.' },
      { label: 'Øktdager-editor', to: '/dev/session-days-preview', blurb: 'SessionDaysEditor for kursrekker.' },
    ],
  },
  {
    title: 'Selger — penger & studio',
    items: [
      { label: 'Utbetalinger', to: '/dev/payout-preview', blurb: 'PayoutSetupCard-tilstander + FAQ.' },
      { label: 'Abonnement', to: '/dev/billing-preview', blurb: 'BillingPlanSections — Pro/Start, forfalt, årlig, feil.' },
      { label: 'Studio', to: '/dev/studio-preview', blurb: 'AffiliationsSection-tilstander + studio-oppsettets settings-layout.' },
      { label: 'Embed-kode', to: '/dev/embed-code-preview', blurb: 'EmbedCodeSection — kopier-kode-seksjonen på studiosiden.' },
    ],
  },
  {
    title: 'Kjøper / offentlig',
    items: [
      { label: 'Oversikt (kjøper)', to: '/dev/buyer-dashboard-preview', blurb: 'BuyerDashboard — mine påmeldinger (kommende/tidligere, avmeldt/avlyst), tomt, laster og feil.' },
      { label: 'Storefront (studio)', to: '/dev/storefront', blurb: 'StudioMasthead + StudioAgendaList — med kurs, tomt, laster, ikke funnet, feil.' },
      { label: 'Kursside (offentlig)', to: '/dev/detail-t1-preview', blurb: 'CourseDetailContent + BookingBar — fullt/utsolgt/stengt/betaling ikke klar, laster, ikke funnet, feil.' },
      { label: 'Kasse (checkout)', to: '/dev/checkout-t1-preview', blurb: 'Checkout-seksjonene — gratis/betalt/stengt/fullt.' },
      { label: 'Embed-kalender', to: '/dev/embed-preview', blurb: 'EmbedCalendar-widgeten på to bredder.' },
    ],
  },
  {
    title: 'Onboarding',
    items: [
      { label: 'Onboarding', to: '/dev/onboarding-preview', blurb: 'De ekte onboarding-stegene (rollevalg, oppsett) + feiltilstand.' },
    ],
  },
];

export default function DevIndex() {
  const total = GROUPS.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <header className="mb-10 space-y-2">
          <h1 className="text-2xl font-medium text-foreground">Previews</h1>
          <p className="max-w-2xl text-sm text-foreground-muted">
            {total} previews av ekte komponenter i sine standard-, tomme, feil- og lastetilstander.
            Kun live kode — ingen mockups. Bare synlig i utviklingsbygg.
          </p>
        </header>

        <div className="space-y-10">
          {GROUPS.map((group) => (
            <section key={group.title} className="space-y-3">
              <h2 className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
                {group.title}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="group block rounded-xl border border-border-subtle bg-background p-4 transition-colors hover:bg-hover"
                  >
                    <div className="text-sm font-medium text-foreground">{item.label}</div>
                    <p className="mt-1 text-xs leading-relaxed text-foreground-muted">{item.blurb}</p>
                    <div className="mt-2 font-mono text-[11px] text-foreground-subtle">{item.to}</div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
