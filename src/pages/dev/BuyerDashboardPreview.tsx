import { HugeiconsIcon } from '@hugeicons/react';
import {
  Clock01Icon,
  Location01Icon,
  Invoice01Icon,
  CalendarCheckIn01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatKroner } from '@/lib/utils';

/**
 * /dev/buyer-dashboard — design exploration for the buyer (kjøper) home.
 *
 * Direction: hybrid of the two references the team liked —
 *   • Urban Company = structure: icon-row meta, sectioned lists, friendly tone,
 *     robust when a studio has no good photo.
 *   • ClassPass = the hero moment: ONE photo-driven "Neste kurs" card on top,
 *     used only where we know there is an image.
 *
 * Scope per direction: keep it to the MAIN page. No extra tabs — the page is
 * almost entirely "future bookings + booking history". Receipts hang off each
 * row, not a separate tab.
 *
 * Exploration note: a few values here are intentionally NOT design tokens yet —
 * the warm off-white surface (#faf9f7), the photo-hero overlay gradient, and
 * the signature date chip. If this direction is approved they become tokens
 * (e.g. --surface-warm) before anything ships to product.
 */

const WARM = '#faf9f7'; // exploratory warm canvas — would become --surface-warm

interface BuyerBooking {
  id: string;
  title: string;
  studio: string;
  location: string;
  instructor: string;
  dateLabel: string; // "ons. 18. jun"
  monthLabel: string; // "JUN"
  dayLabel: string; // "18"
  time: string; // "18:00–19:00"
  amount: number;
  imageUrl: string | null;
  status: 'confirmed' | 'cancelled' | 'course_cancelled' | 'refunded';
  hasReceipt: boolean;
}

const UPCOMING: BuyerBooking[] = [
  {
    id: 'vinyasa',
    title: 'Vinyasa Flow — vårsemester',
    studio: 'Morgenflyt Studio',
    location: 'Storgata 12, Oslo',
    instructor: 'Olivia Berg',
    dateLabel: 'ons. 18. jun',
    monthLabel: 'JUN',
    dayLabel: '18',
    time: '18:00–19:00',
    amount: 2200,
    imageUrl: 'https://picsum.photos/seed/vinyasaflow/960/540',
    status: 'confirmed',
    hasReceipt: true,
  },
  {
    id: 'morning',
    title: 'Morning Flow',
    studio: 'Morgenflyt Studio',
    location: 'Storgata 12, Oslo',
    instructor: 'Olivia Berg',
    dateLabel: 'tor. 19. jun',
    monthLabel: 'JUN',
    dayLabel: '19',
    time: '09:00–10:00',
    amount: 450,
    imageUrl: 'https://picsum.photos/seed/morningflow/320/320',
    status: 'confirmed',
    hasReceipt: true,
  },
  {
    id: 'yin',
    // No image — shows the Urban-Company-style robust fallback.
    title: 'Yin Yoga — drop-in',
    studio: 'Pust Studio',
    location: 'Thorvald Meyers gate 5, Oslo',
    instructor: 'Mariam Holt',
    dateLabel: 'man. 23. jun',
    monthLabel: 'JUN',
    dayLabel: '23',
    time: '20:00–21:00',
    amount: 200,
    imageUrl: null,
    status: 'confirmed',
    hasReceipt: true,
  },
];

const PAST: BuyerBooking[] = [
  {
    id: 'sound',
    title: 'Lydbad & pust',
    studio: 'Pust Studio',
    location: 'Thorvald Meyers gate 5, Oslo',
    instructor: 'Mariam Holt',
    dateLabel: 'søn. 1. jun',
    monthLabel: 'JUN',
    dayLabel: '1',
    time: '17:00–18:30',
    amount: 350,
    imageUrl: 'https://picsum.photos/seed/soundbath/320/320',
    status: 'confirmed',
    hasReceipt: true,
  },
  {
    id: 'reformer',
    title: 'Reformer Pilates',
    studio: 'Kjerne Studio',
    location: 'Bogstadveien 30, Oslo',
    instructor: 'Sofie Dahl',
    dateLabel: 'tir. 20. mai',
    monthLabel: 'MAI',
    dayLabel: '20',
    time: '07:00–07:50',
    amount: 320,
    imageUrl: 'https://picsum.photos/seed/reformer/320/320',
    status: 'refunded',
    hasReceipt: true,
  },
  {
    id: 'hot',
    title: 'Hot Yoga',
    studio: 'Varme Studio',
    location: 'Grünerløkka, Oslo',
    instructor: 'Jonas Vik',
    dateLabel: 'ons. 7. mai',
    monthLabel: 'MAI',
    dayLabel: '7',
    time: '19:00–20:00',
    amount: 250,
    imageUrl: null,
    status: 'course_cancelled',
    hasReceipt: false,
  },
];

function statusBadge(status: BuyerBooking['status']) {
  switch (status) {
    case 'course_cancelled':
      return <Badge variant="warning" shape="pill" size="sm">Avlyst</Badge>;
    case 'cancelled':
      return <Badge variant="neutral" shape="pill" size="sm">Avmeldt</Badge>;
    case 'refunded':
      return <Badge variant="neutral" shape="pill" size="sm">Refundert</Badge>;
    default:
      return null;
  }
}

/** Signature date chip — month strip + day, reused on hero and (smaller) rows. */
function DateChip({ month, day, className }: { month: string; day: string; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-lg text-center shadow-sm', className)}>
      <div className="bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
        {month}
      </div>
      <div className="bg-surface py-0.5 text-base font-semibold leading-tight text-foreground">
        {day}
      </div>
    </div>
  );
}

/* ── ClassPass borrow: the one photo-driven hero ────────────────────────── */
function NextUpHero({ booking }: { booking: BuyerBooking }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      <div className="relative h-44 sm:h-52">
        {booking.imageUrl ? (
          <img src={booking.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(16,24,40,0) 30%, rgba(16,24,40,.78) 100%)' }}
        />
        <DateChip month={booking.monthLabel} day={booking.dayLabel} className="absolute left-4 top-4 w-12" />
        <Badge variant="success" shape="pill" size="sm" className="absolute right-4 top-4">
          Påmeldt
        </Badge>
        <div className="absolute inset-x-4 bottom-4 text-white">
          <p className="text-xs font-medium uppercase tracking-wide opacity-90">Ditt neste kurs</p>
          <h2 className="mt-0.5 text-2xl font-semibold leading-tight tracking-tight">{booking.title}</h2>
        </div>
      </div>

      <div className="p-4 sm:p-5" style={{ background: WARM }}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <HugeiconsIcon icon={Clock01Icon} size={16} className="text-primary" strokeWidth={1.8} />
            {booking.dateLabel} · {booking.time}
          </span>
          <span className="inline-flex items-center gap-1.5 text-foreground-muted">
            <HugeiconsIcon icon={Location01Icon} size={16} strokeWidth={1.8} />
            {booking.studio} · {booking.location}
          </span>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-border-subtle pt-4 sm:flex-row sm:items-center">
          <span className="text-sm text-foreground-muted">med {booking.instructor}</span>
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="secondary" className="flex-1 sm:flex-none">Veibeskrivelse</Button>
            <Button className="flex-1 sm:flex-none">Se detaljer</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Urban Company borrow: structured, icon-row list row ─────────────────── */
function BookingRow({ booking, dimmed }: { booking: BuyerBooking; dimmed?: boolean }) {
  const badge = statusBadge(booking.status);
  return (
    <li className="flex items-center gap-3 p-3.5 sm:gap-4">
      <div className={cn('relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-16', dimmed && 'opacity-90')}>
        {booking.imageUrl ? (
          <img src={booking.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <DateChip month={booking.monthLabel} day={booking.dayLabel} className="absolute inset-0 flex flex-col justify-center" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-foreground">{booking.title}</p>
          {badge}
        </div>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-foreground-muted">
          <HugeiconsIcon icon={Clock01Icon} size={15} strokeWidth={1.8} />
          {booking.dateLabel} · {booking.time}
        </p>
        <p className="inline-flex items-center gap-1.5 text-sm text-foreground-muted">
          <HugeiconsIcon icon={Location01Icon} size={15} strokeWidth={1.8} />
          {booking.studio}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-medium tabular-nums text-foreground">
          {booking.amount === 0 ? 'Gratis' : formatKroner(booking.amount)}
        </p>
        {booking.hasReceipt && (
          <a
            href="#"
            className="mt-0.5 inline-flex items-center gap-1 text-sm text-foreground-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            <HugeiconsIcon icon={Invoice01Icon} size={14} strokeWidth={1.8} />
            Kvittering
          </a>
        )}
      </div>

      <HugeiconsIcon icon={ArrowRight01Icon} size={18} className="hidden shrink-0 text-foreground-muted sm:block" strokeWidth={1.8} />
    </li>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground-muted">
        {title}
        <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{count}</span>
      </h2>
      <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border bg-surface">
        {children}
      </ul>
    </section>
  );
}

export default function BuyerDashboardPreview() {
  const [next, ...restUpcoming] = UPCOMING;

  return (
    <div className="min-h-screen" style={{ background: WARM }}>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Hei, Anna</h1>
          <HugeiconsIcon icon={CalendarCheckIn01Icon} size={20} className="text-foreground-muted" strokeWidth={1.8} />
        </header>

        <div className="space-y-10">
          {/* ClassPass hero — the single nearest upcoming booking */}
          <NextUpHero booking={next} />

          {/* Urban Company lists — the actual job of this page */}
          {restUpcoming.length > 0 && (
            <Section title="Kommende" count={restUpcoming.length}>
              {restUpcoming.map((b) => (
                <BookingRow key={b.id} booking={b} />
              ))}
            </Section>
          )}

          <Section title="Tidligere" count={PAST.length}>
            {PAST.map((b) => (
              <BookingRow key={b.id} booking={b} dimmed />
            ))}
          </Section>
        </div>
      </div>
    </div>
  );
}
