import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Plus,
  Share2,
  UserPlus,
  Users,
} from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { formatKroner } from '@/lib/utils';

// ─── Sample data ──────────────────────────────────────────────────────────
const NEXT_PAYOUT = 2200;
const PAYOUT_DATE = 'tirsdag 19. mai';
const PENDING_THIS_WEEK = 1450;
const PENDING_SIGNUPS = 7;

const UPCOMING = [
  { id: '1', title: 'Morning Flow', day: 'I dag', time: '09:00', signups: 8, capacity: 10 },
  { id: '2', title: 'Yin Yoga', day: 'I morgen', time: '18:00', signups: 5, capacity: 12 },
  { id: '3', title: 'Vinyasa', day: 'Onsdag', time: '17:30', signups: 11, capacity: 12 },
  { id: '4', title: 'Coffee & Flow', day: 'Lørdag', time: '09:00', signups: 3, capacity: 10 },
];

const ACTIVITY = [
  { id: '1', name: 'Olav Hansen', course: 'Morning Flow', when: '2 t' },
  { id: '2', name: 'Maja Berg', course: 'Yin Yoga', when: '4 t' },
  { id: '3', name: 'Lars Solheim', course: 'Vinyasa', when: 'i går' },
  { id: '4', name: 'Tone Eriksen', course: 'Morning Flow', when: '2 d' },
];

const LAST_CLASS = {
  title: 'Morning Flow',
  date: 'søndag 12. mai',
  attended: 8,
  capacity: 10,
  revenue: 2000,
};

const RESOURCES = [
  { title: 'MVA for yogalærere', desc: 'Når må du registrere deg, og når trenger du ikke', icon: FileText },
  { title: 'Skatt for selvstendige', desc: 'Forskuddsskatt, fradrag og bokføring', icon: BookOpen },
  { title: 'Hvordan dele kurslenker', desc: 'Lag QR-kode og del på Instagram', icon: Share2 },
];

const PayoutPreview = () => {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <div className="mx-auto w-full max-w-5xl px-6 py-8 lg:py-12">
        {/* ─── Header: payout headline + create CTA ───────────────────────── */}
        <header className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground-muted">Oversikt</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
              {formatKroner(NEXT_PAYOUT)}
            </h1>
            <p className="mt-1 text-sm text-foreground-muted">
              Neste utbetaling {PAYOUT_DATE}{' '}
              <span aria-hidden="true">·</span>{' '}
              <span className="tabular-nums">{formatKroner(PENDING_THIS_WEEK)}</span> på vei inn fra {PENDING_SIGNUPS} påmeldinger
            </p>
          </div>
          <Button size="default" className="shrink-0">
            <Plus data-icon="inline-start" />
            Opprett kurs
          </Button>
        </header>

        {/* ─── Last class recap (Substack pattern) ─────────────────────────── */}
        <section className="mb-12">
          <h2 className="mb-4 text-sm font-medium text-foreground-muted">Forrige time</h2>
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-background p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">{LAST_CLASS.title}</p>
              <p className="mt-1 text-sm text-foreground-muted">
                {LAST_CLASS.date}{' '}
                <span aria-hidden="true">·</span>{' '}
                <span className="tabular-nums">{LAST_CLASS.attended}/{LAST_CLASS.capacity}</span> påmeldte{' '}
                <span aria-hidden="true">·</span>{' '}
                <span className="tabular-nums">{formatKroner(LAST_CLASS.revenue)}</span>
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="ghost" size="sm">
                <Share2 data-icon="inline-start" />
                Del
              </Button>
              <Button variant="ghost" size="sm">
                Se detaljer <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
        </section>

        {/* ─── Two-column: Upcoming + Activity ─────────────────────────────── */}
        <section className="mb-16 grid grid-cols-1 divide-y divide-border lg:grid-cols-2 lg:divide-y-0 lg:divide-x">
          <div className="flex flex-col pb-8 lg:pb-0 lg:pr-8">
            <h2 className="mb-6 text-xl font-medium tracking-tight text-foreground">Siste aktivitet</h2>
            <div className="space-y-2">
              {ACTIVITY.map((a) => (
                <div
                  key={a.id}
                  className="group flex items-center gap-3 rounded-lg p-3 transition-colors duration-150 hover:bg-muted"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground-muted">
                    <UserPlus className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                    <p className="mt-1 truncate text-sm text-foreground-muted">Meldte seg på {a.course}</p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-foreground-muted">{a.when}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col pt-8 lg:pt-0 lg:pl-8">
            <h2 className="mb-6 text-xl font-medium tracking-tight text-foreground">Neste kurs</h2>
            <div className="space-y-2">
              {UPCOMING.map((c) => {
                const isFull = c.signups >= c.capacity;
                return (
                  <div
                    key={c.id}
                    className="group block rounded-lg bg-muted p-3 transition-opacity duration-150 hover:opacity-80"
                  >
                    <p className="truncate text-sm font-medium text-foreground">{c.title}</p>
                    <div className="mt-1 flex items-center gap-3 text-sm text-foreground-muted tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3.5 shrink-0" />
                        {c.day}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5 shrink-0" />
                        {c.time}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5 shrink-0" />
                        {c.signups}/{c.capacity}
                        {isFull && ' · Fullt'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── Resources rail (Substack pattern) ───────────────────────────── */}
        <section className="border-t border-border pt-10">
          <h2 className="mb-6 text-sm font-medium text-foreground-muted">Ressurser for læreren</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {RESOURCES.map((r) => {
              const Icon = r.icon;
              return (
                <a
                  key={r.title}
                  href="#"
                  className="group flex flex-col gap-2 rounded-lg border border-border p-4 outline-none transition-colors duration-150 hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground/15"
                >
                  <div className="flex items-center justify-between">
                    <Icon className="size-4 text-foreground-muted" />
                    <ArrowUpRight className="size-4 text-foreground-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-sm text-foreground-muted">{r.desc}</p>
                </a>
              );
            })}
          </div>
        </section>

        <p className="mt-12 text-xs text-foreground-muted">
          Preview · sample data only. Combines: payout-first headline (Stripe Express), single big CTA in header (Cal.com),
          last-class recap (Substack), evergreen resources rail (Substack). Current 2-column upcoming/activity preserved.
        </p>
      </div>
    </div>
  );
};

export default PayoutPreview;
