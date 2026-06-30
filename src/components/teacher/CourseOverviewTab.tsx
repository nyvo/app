import { Fragment, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { MapEmbed } from '@/components/ui/map-embed';
import { cn, formatKroner } from '@/lib/utils';
import { MapPin, ChevronRight } from '@/lib/icons';
import type { MappedCourse } from '@/hooks/use-course-detail';
import type { CourseSession } from '@/types/database';

interface CourseOverviewTabProps {
  course: MappedCourse;
  /** Confirmed signups on the course — drives the "Påmeldte" KPI (matches the
   *  Påmeldte tab count). */
  enrolledCount: number;
  /** Actual paid revenue (sum of amount_paid on paid signups) — "Inntekt" KPI. */
  revenue: number;
  /** Raw Stripe account status (pending | restricted | rejected | enabled | null) */
  paymentSetupStatus: string | null;
  paymentSetupComplete: boolean;
  /** Whether payment setup is a publish requirement for this seller (Pro only).
   *  Free-tier sellers publish without Stripe onboarding — the payout nudge in
   *  the readiness card is hidden for them. */
  paymentSetupRequired: boolean;
  allowsDropIn: boolean;
  onAllowsDropInChange: (next: boolean) => void;
  dropInPrice: number;
  onDropInPriceChange: (next: number) => void;
  acceptsLateSignups: boolean;
  onAcceptsLateSignupsChange: (next: boolean) => void;
  /** Opens the full "Se alle timer" modal (session list). */
  onOpenKursplan: () => void;
  /** Opens the sessions modal straight into reschedule for one session (the
   *  per-row pencil). */
  onEditSession: (sessionId: string) => void;
  /** Routes to /settings/payouts. Used by the payout readiness nudge. */
  onSetupPaymentsClick: () => void;
  /** Publishes the course — fired by the draft readiness card's CTA. */
  onPublish: () => void;
  /** Publish request in flight — drives the CTA button's loading state. */
  publishing: boolean;
  /** All session rows (date + time per occurrence). Renders the Timeplan card
   *  for every format: single one-day, multi-day single, and weekly series. */
  sessions: CourseSession[];
}

const WAITING_STATUSES = new Set(['pending', 'restricted']);

const WEEKDAYS_LONG = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'] as const;
const MONTHS_LONG = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
] as const;

/** Parse a YYYY-MM-DD key as a *local* date (avoids the UTC off-by-one that
 *  `new Date('2026-07-07')` causes in negative-offset timezones). */
function localDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

function weekdayLong(date: string): string {
  return WEEKDAYS_LONG[localDate(date).getDay()];
}

function dayMonth(date: string): string {
  const d = localDate(date);
  return `${d.getDate()}. ${MONTHS_LONG[d.getMonth()]}`;
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function shortTime(t: string | null | undefined): string {
  return t ? t.slice(0, 5) : '';
}

/** Time range with a no-space en-dash (Norwegian range convention): 06:00–07:00. */
function sessionTimeRange(s: CourseSession): string {
  const start = shortTime(s.start_time);
  if (!start) return '';
  const end = shortTime(s.end_time);
  return end ? `${start}–${end}` : start;
}

export function CourseOverviewTab({
  course,
  enrolledCount,
  revenue,
  paymentSetupStatus,
  paymentSetupRequired,
  paymentSetupComplete,
  allowsDropIn,
  onAllowsDropInChange,
  dropInPrice,
  onDropInPriceChange,
  acceptsLateSignups,
  onAcceptsLateSignupsChange,
  onOpenKursplan,
  onEditSession,
  onSetupPaymentsClick,
  onPublish,
  publishing,
  sessions,
}: CourseOverviewTabProps) {
  const isSeries = course.format === 'series';
  const isFree = course.price <= 0;
  const isPro = paymentSetupRequired;
  // Persisted status is the source of truth — reconcile_course_lifecycle keeps
  // it honest (upcoming/active/completed), so the branches below work off it.
  const status = course.status;

  const ordered = sessions.slice().sort((a, b) => a.session_date.localeCompare(b.session_date));

  // KPI spine for every live/finished state (draft shows the readiness card
  // instead — no signups, no revenue, so the zeros would be dead).
  const stats: [string, string][] = [
    [
      'Påmeldte',
      course.capacity > 0 ? `${enrolledCount} / ${course.capacity}` : String(enrolledCount),
    ],
    // Inntekt is integrated-payment revenue — always 0 kr on free, so it's
    // omitted there rather than showing a dead metric.
    ...(isPro ? ([['Inntekt', formatKroner(revenue)]] as [string, string][]) : []),
    ['Pris', course.price > 0 ? formatKroner(course.price) : 'Gratis'],
  ];

  // Drop-in and late-signups are both series-only concepts (the RPC ignores
  // them for single courses), so the whole section is hidden on enkeltkurs.
  const showTogglesCard =
    isSeries && (status === 'draft' || status === 'upcoming' || status === 'active');

  return (
    <div className="space-y-4">
      {status === 'draft' ? (
        <ReadinessCard
          paymentSetupRequired={paymentSetupRequired}
          paymentSetupComplete={paymentSetupComplete}
          paymentSetupStatus={paymentSetupStatus}
          onPublish={onPublish}
          publishing={publishing}
          onSetupPaymentsClick={onSetupPaymentsClick}
        />
      ) : (
        <StatRow stats={stats} />
      )}

      {/* Tid og sted — two equal-height cards inside one rhythm. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TimeplanCard
          sessions={ordered}
          onEditSession={onEditSession}
          onOpenAll={onOpenKursplan}
        />
        <StedCard course={course} />
      </div>

      {showTogglesCard && (
        <SettingsCard
          isFree={isFree}
          allowsDropIn={allowsDropIn}
          onAllowsDropInChange={onAllowsDropInChange}
          dropInPrice={dropInPrice}
          onDropInPriceChange={onDropInPriceChange}
          acceptsLateSignups={acceptsLateSignups}
          onAcceptsLateSignupsChange={onAcceptsLateSignupsChange}
        />
      )}
    </div>
  );
}

// ─── Framed card — tinted outer surface (header) + white inset panel ──────
//
// A faint-primary outer surface forms the header (title left, optional action
// right); the content lives in a white bordered panel inset. No shadows —
// hierarchy comes from the tint/white contrast.

function FramedCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-primary-subtle p-2">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <p className="text-sm font-medium text-primary">{title}</p>
        {action && <span className="text-sm text-primary/65">{action}</span>}
      </div>
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-primary-border bg-surface">
        {children}
      </div>
    </div>
  );
}

// ─── KPI spine (Nøkkeltall) ───────────────────────────────────────────────

function StatRow({ stats }: { stats: [string, string][] }) {
  return (
    <FramedCard title="Nøkkeltall">
      <div className="flex items-stretch">
        {stats.map(([label, value], i) => (
          <Fragment key={label}>
            {/* Short inset divider — subtle, not a full-height border. */}
            {i > 0 && <div className="my-auto h-12 w-px shrink-0 bg-border-subtle" />}
            <div className="flex-1 px-5 py-5 text-center">
              <p className="text-sm text-foreground-muted">{label}</p>
              <p className="mt-1.5 text-2xl font-medium tabular-nums text-foreground">{value}</p>
            </div>
          </Fragment>
        ))}
      </div>
    </FramedCard>
  );
}

// ─── Draft readiness (Publisering) ────────────────────────────────────────
//
// Title, description, location and capacity are all required at creation, so a
// draft only ever needs the one DB-enforced step: Pro payouts. Two states —
// "set up payouts" (Pro, not connected) or "ready to publish".

function ReadinessCard({
  paymentSetupRequired,
  paymentSetupComplete,
  paymentSetupStatus,
  onPublish,
  publishing,
  onSetupPaymentsClick,
}: {
  paymentSetupRequired: boolean;
  paymentSetupComplete: boolean;
  paymentSetupStatus: string | null;
  onPublish: () => void;
  publishing: boolean;
  onSetupPaymentsClick: () => void;
}) {
  const paymentsNeeded = paymentSetupRequired && !paymentSetupComplete;
  const paymentPending =
    paymentsNeeded && paymentSetupStatus !== null && WAITING_STATUSES.has(paymentSetupStatus);

  let heading: string;
  let sub: string;
  let label: string;
  let onClick: () => void;
  let loading = false;

  if (paymentsNeeded) {
    if (paymentPending) {
      heading = 'Utbetaling til godkjenning';
      sub = 'Venter på godkjenning fra Stripe.';
      label = 'Se status';
    } else {
      heading = 'Sett opp utbetaling for å publisere';
      sub = 'Koble til Stripe for å ta imot betaling — det eneste som gjenstår.';
      label = 'Sett opp utbetaling';
    }
    onClick = onSetupPaymentsClick;
  } else {
    heading = 'Klar til å publisere';
    sub = 'Alt er på plass — publiser for å åpne for påmelding.';
    label = 'Publiser kurs';
    onClick = onPublish;
    loading = publishing;
  }

  return (
    <FramedCard title="Publisering">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md">
          <p className="text-lg font-medium text-foreground">{heading}</p>
          <p className="mt-1.5 text-base text-foreground-muted">{sub}</p>
        </div>
        <Button
          onClick={onClick}
          loading={loading}
          loadingText="Publiserer"
          className="shrink-0 self-start sm:self-auto"
        >
          {label}
        </Button>
      </div>
    </FramedCard>
  );
}

// ─── Timeplan ─────────────────────────────────────────────────────────────
//
// Single-day → a centered "when" block (so it fills next to the Sted map
// instead of leaving a lone row). Multi-day/series → the first sessions as
// accent-line rows + a "Se alle timer" link into the modal.

function TimeplanCard({
  sessions,
  onEditSession,
  onOpenAll,
}: {
  sessions: CourseSession[];
  onEditSession: (id: string) => void;
  onOpenAll: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);

  if (sessions.length <= 1) {
    const s = sessions[0];
    // A single date — a centered "when" block (read-only; its time is edited
    // from Rediger). Fills the card next to the Sted map.
    return (
      <FramedCard title="Timeplan">
        <div className="flex flex-1 flex-col items-center justify-center p-5 text-center">
          {s ? (
            <>
              <p className="text-base capitalize text-foreground-muted">{weekdayLong(s.session_date)}</p>
              <p className="mt-0.5 text-xl font-medium text-foreground">{dayMonth(s.session_date)}</p>
              <p className="mt-1 text-base tabular-nums text-foreground-muted">{sessionTimeRange(s)}</p>
            </>
          ) : (
            <p className="text-base text-foreground-muted">Ingen dato lagt til ennå</p>
          )}
        </div>
      </FramedCard>
    );
  }

  // With more than 3 sessions there are always upcoming ones to fill the three
  // preview slots, so show those. With only 2–3, keep finished rows (dimmed +
  // a "Fullført" badge) so the card stays filled instead of going sparse.
  const upcoming = sessions.filter((s) => s.session_date >= today);
  const preview =
    sessions.length > 3 && upcoming.length > 0 ? upcoming.slice(0, 3) : sessions.slice(0, 3);
  return (
    <FramedCard title="Timeplan">
      <div className="flex flex-1 flex-col p-5">
        <div className="space-y-1">
          {preview.map((s) => (
            <SessionRow key={s.id} session={s} today={today} onEdit={() => onEditSession(s.id)} />
          ))}
        </div>
        {sessions.length > preview.length && (
          <button
            type="button"
            onClick={onOpenAll}
            className="mt-3 inline-flex w-fit text-sm font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground"
          >
            Se alle timer
          </button>
        )}
      </div>
    </FramedCard>
  );
}

function SessionRow({
  session,
  today,
  onEdit,
}: {
  session: CourseSession;
  today: string;
  onEdit: () => void;
}) {
  const cancelled = session.status === 'cancelled';
  const past = session.session_date < today;
  const editable = !cancelled && !past;
  const label = `${cap(weekdayLong(session.session_date))} ${dayMonth(session.session_date)}`;

  // Accent line + date/time. Finished/cancelled rows dim, but their status
  // badge stays full-opacity so it reads clearly.
  const left = (
    <div className={cn('flex min-w-0 flex-1 items-stretch gap-4', !editable && 'opacity-50')}>
      <span className="w-1 self-stretch rounded-full bg-primary/40" />
      <div className="min-w-0">
        <p className="text-base font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-sm tabular-nums text-foreground-muted">
          {sessionTimeRange(session)}
        </p>
      </div>
    </div>
  );

  const layout = '-mx-3 flex w-[calc(100%+1.5rem)] items-stretch gap-4 rounded-lg px-3 py-2';

  // Editable (upcoming) rows are the tap target — chevron + hover, open the
  // reschedule modal.
  if (editable) {
    return (
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Endre ${label}`}
        className={cn(layout, 'group text-left transition-colors hover:bg-hover')}
      >
        {left}
        <ChevronRight className="size-5 shrink-0 self-center text-foreground-subtle transition-transform group-hover:translate-x-0.5" />
      </button>
    );
  }

  return (
    <div className={layout}>
      {left}
      <Badge
        variant={cancelled ? 'warning' : 'neutral'}
        shape="pill"
        size="sm"
        className="shrink-0 self-center"
      >
        {cancelled ? 'Avlyst' : 'Fullført'}
      </Badge>
    </div>
  );
}

// ─── Sted — name + map fill ───────────────────────────────────────────────

function StedCard({ course }: { course: MappedCourse }) {
  const hasCoords =
    !!course.locationPlaceId ||
    (course.locationLat != null && course.locationLon != null);

  return (
    <FramedCard title="Sted">
      <div className="p-5">
        {course.location ? (
          <>
            <p className="text-base font-medium text-foreground">{course.location}</p>
            {course.locationAddress && course.locationAddress !== course.location && (
              <p className="mt-0.5 text-sm text-foreground-muted">{course.locationAddress}</p>
            )}
          </>
        ) : (
          <p className="text-base text-foreground-muted">Ikke lagt til ennå</p>
        )}
      </div>
      <div
        className="relative flex flex-1 items-center justify-center border-t border-border-subtle bg-muted"
        style={{ minHeight: '9rem' }}
      >
        {hasCoords ? (
          <MapEmbed
            placeId={course.locationPlaceId}
            lat={course.locationLat}
            lon={course.locationLon}
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <MapPin className="size-7 text-foreground-subtle" />
        )}
      </div>
    </FramedCard>
  );
}

// ─── Kursinnstillinger (series only) ──────────────────────────────────────

function SettingsCard(props: TogglesSectionProps) {
  return (
    <FramedCard title="Kursinnstillinger">
      <div className="p-5">
        <TogglesSection {...props} />
      </div>
    </FramedCard>
  );
}

// ─── KPI cards (standalone export — used by the dev preview) ──────────────

export function CourseKpis({
  enrolled,
  capacity,
  revenue,
  price,
  isPro,
}: {
  enrolled: number;
  capacity: number;
  revenue: number;
  price: number;
  isPro: boolean;
}) {
  return (
    <div className={cn('grid grid-cols-1 gap-3', isPro ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
      <KpiCard
        label="Påmeldte"
        value={capacity > 0 ? `${enrolled} / ${capacity}` : String(enrolled)}
      />
      {isPro && <KpiCard label="Inntekt" value={formatKroner(revenue)} />}
      <KpiCard label="Pris" value={price > 0 ? formatKroner(price) : 'Gratis'} />
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-5">
      <p className="text-sm text-foreground-muted">{label}</p>
      <p className="mt-2 text-3xl font-medium text-foreground tabular-nums">{value}</p>
    </div>
  );
}

// ─── Toggles (drop-in + late signups) ─────────────────────────────────────

interface TogglesSectionProps {
  isFree: boolean;
  allowsDropIn: boolean;
  onAllowsDropInChange: (next: boolean) => void;
  dropInPrice: number;
  onDropInPriceChange: (next: number) => void;
  acceptsLateSignups: boolean;
  onAcceptsLateSignupsChange: (next: boolean) => void;
}

function TogglesSection({
  isFree,
  allowsDropIn,
  onAllowsDropInChange,
  dropInPrice,
  onDropInPriceChange,
  acceptsLateSignups,
  onAcceptsLateSignupsChange,
}: TogglesSectionProps) {
  return (
    <div className="divide-y divide-border-subtle">
      <DropInToggleRow
        checked={allowsDropIn}
        onChange={onAllowsDropInChange}
        price={dropInPrice}
        onPriceChange={onDropInPriceChange}
      />
      <ToggleRow
        label="Tillat påmelding etter oppstart"
        help={
          isFree
            ? 'Lar deltakere melde seg på etter at kurset har startet.'
            : 'Prisen blir justert automatisk etter antall uker igjen.'
        }
        checked={acceptsLateSignups}
        onChange={onAcceptsLateSignupsChange}
      />
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  children?: React.ReactNode;
}

function ToggleRow({ label, help, checked, onChange, children }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-6 py-5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-foreground">{label}</p>
        {help && <p className="mt-1 text-base text-foreground-muted">{help}</p>}
        {children}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-1 shrink-0" />
    </div>
  );
}

interface DropInToggleRowProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  price: number;
  onPriceChange: (next: number) => void;
}

function DropInToggleRow({ checked, onChange, price, onPriceChange }: DropInToggleRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [priceError, setPriceError] = useState(false);

  function handleToggle(next: boolean) {
    if (next && price <= 0) {
      // Block activation when there's no price — focus the input + flash the hint.
      setPriceError(true);
      inputRef.current?.focus();
      return;
    }
    setPriceError(false);
    onChange(next);
  }

  function handlePriceChange(next: number) {
    if (next > 0) setPriceError(false);
    onPriceChange(next);
  }

  return (
    <div className="flex items-start justify-between gap-6 py-5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-foreground">Tillat drop-in</p>
        <div className="mt-2.5 flex items-center gap-2.5">
          <label htmlFor="overview-drop-in-price" className="text-sm text-foreground-muted">
            Pris per time
          </label>
          <div className="relative inline-flex items-center">
            <Input
              ref={inputRef}
              id="overview-drop-in-price"
              type="number"
              min={0}
              step={50}
              value={price === 0 ? '' : price}
              onChange={(e) => {
                const next = Number(e.target.value);
                handlePriceChange(Number.isFinite(next) ? next : 0);
              }}
              aria-invalid={priceError || undefined}
              className="h-8 w-[120px] pr-9 tabular-nums"
            />
            <span className="pointer-events-none absolute right-3 select-none text-sm text-foreground-muted">
              kr
            </span>
          </div>
        </div>
        {priceError && (
          <p className="mt-2 text-sm text-danger">Sett en pris før du slår på drop-in.</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={handleToggle} className="mt-1 shrink-0" />
    </div>
  );
}
