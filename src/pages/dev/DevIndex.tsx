import { Link } from 'react-router-dom';
import { ChevronRight } from '@/lib/icons';

/**
 * Dev preview index — every auth-free /dev/* route, clickable, so previews
 * are reachable through navigation instead of memorized URLs. Reached from
 * the sidebar "Dev" item (rendered in dev builds only). Keep this list in
 * sync with the /dev/* routes in App.tsx when adding a preview.
 */
const PREVIEWS: { path: string; label: string; note?: string }[] = [
  { path: '/dev/dashboard-preview', label: 'Dashboard (Oversikt)' },
  { path: '/dev/income-chart-preview', label: 'Inntekt-graf' },
  { path: '/dev/courses-list-preview', label: 'Kursliste (tabell)' },
  { path: '/dev/courses-grid-preview', label: 'Kursliste (grid)' },
  { path: '/dev/course-detail-preview', label: 'Kursdetalj-badges' },
  { path: '/dev/schedule-preview', label: 'Timeplan' },
  { path: '/dev/billing-preview', label: 'Abonnement (plan-kort)' },
  { path: '/dev/payout-preview', label: 'Utbetalingskonto (5 tilstander)' },
  { path: '/dev/embed-code-preview', label: 'Nettsted — embed-kode', note: 'EmbedCodeSection (tidligere Nettsted-fanen)' },
  { path: '/dev/embed-preview', label: 'Nettsted — kalender-embed' },
  { path: '/dev/settings-rows-preview', label: 'SettingsRows-mønsteret' },
  { path: '/dev/modals-buttons-toasts', label: 'Modaler, knapper og toasts' },
  { path: '/dev/token-preview', label: 'Design-tokens' },
  { path: '/dev/onboarding-preview', label: 'Onboarding' },
  { path: '/dev/create-course-preview', label: 'Opprett kurs' },
  { path: '/dev/course-builder-preview', label: 'Course builder (wireframe)' },
  { path: '/dev/course-builder-live', label: 'Course builder (live)' },
  { path: '/dev/course-builder-eventbrite', label: 'Course builder (Eventbrite-ref)' },
  { path: '/dev/session-days-preview', label: 'Session days' },
  { path: '/dev/oversikt-wireframe', label: 'Kurs-oversikt (wireframe)' },
  { path: '/dev/studio-preview', label: 'Studio (wireframe)' },
  { path: '/dev/draft-experience-preview', label: 'Utkast-opplevelsen' },
  { path: '/dev/checkout-form-rework', label: 'Checkout-skjema (rework)' },
  { path: '/dev/detail-rework', label: 'Kursdetalj (rework)' },
  { path: '/dev/detail-t1-preview', label: 'Kursdetalj (T1)' },
  { path: '/dev/checkout-t1-preview', label: 'Checkout (T1)' },
  { path: '/dev/landing-wireframe', label: 'Landing (wireframe)' },
  { path: '/dev/audit-fixes-preview', label: 'Audit-fixes' },
];

export default function DevIndex() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-medium text-foreground">Dev-forhåndsvisninger</h1>
        <p className="mt-2 text-base text-foreground-muted">
          Auth-frie forhåndsvisninger av komponenter og sider. Kun tilgjengelig lokalt.
        </p>

        <div className="-mx-3 mt-8 divide-y divide-border-subtle">
          {PREVIEWS.map((p) => (
            <Link
              key={p.path}
              to={p.path}
              className="group flex items-center gap-4 rounded-lg px-3 py-3.5 no-underline outline-none transition-colors hover:bg-hover hover:border-transparent focus-visible:bg-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring-subtle [&:has(+:hover)]:border-transparent"
            >
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-foreground">{p.label}</p>
                <p className="truncate text-sm text-foreground-muted">
                  {p.note ? `${p.note} — ` : ''}{p.path}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 -translate-x-1 text-foreground-subtle opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
