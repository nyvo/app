import { Fragment, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { MapEmbed } from '@/components/ui/map-embed';
import { FramedCard, FramedCardPanel } from '@/components/teacher/FramedCard';
import { cn, formatKroner } from '@/lib/utils';
import { osloTodayKey } from '@/utils/dateUtils';
import { MapPin, ChevronRight } from '@/lib/icons';
import { InfoTooltip } from '@/components/ui/info-tooltip';
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
  /** Whether payment setup is a publish requirement for this course — true
   *  when it has any paid tier (price or drop-in), on every plan. 0 kr courses
   *  publish without Stripe onboarding, so the payout nudge is hidden. */
  paymentSetupRequired: boolean;
  allowsDropIn: boolean;
  onAllowsDropInChange: (next: boolean) => void;
  dropInPrice: number;
  onDropInPriceChange: (next: number) => void;
  /** Commits an edited drop-in price (fires on input blur) — this tab has no
   *  save bar, so the price persists the moment the field is left. */
  onDropInPriceBlur?: () => void;
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
  /** Sessions query still loading — the Timeplan card shows a skeleton. */
  sessionsLoading?: boolean;
  /** Sessions query failed — the Timeplan card shows an inline error, never a
   *  false "no dates yet". */
  sessionsError?: boolean;
  /** Participant-derived stats (Påmeldte/Inntekt) couldn't load — render `–`
   *  instead of a fabricated 0. */
  statsUnavailable?: boolean;
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

/** Timeplan card header status, right-aligned next to the title: the start
 *  date before the first session, "Uke x/x" (series) or "Dag x/x" (multi-day
 *  enkeltkurs) once it's underway (x = number of sessions whose date has
 *  arrived, out of the total). Assumes `sessions` is already sorted ascending
 *  by date (the caller's `ordered`). */
function timeplanHeaderStatus(
  sessions: CourseSession[],
  today: string,
  unit: 'Uke' | 'Dag',
): string | null {
  if (sessions.length === 0) return null;
  const total = sessions.length;
  if (sessions[0].session_date > today) {
    return `Kurset starter ${dayMonth(sessions[0].session_date)}`;
  }
  const current = sessions.filter((s) => s.session_date <= today).length;
  return `${unit} ${current}/${total}`;
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
  onDropInPriceBlur,
  acceptsLateSignups,
  onAcceptsLateSignupsChange,
  onOpenKursplan,
  onEditSession,
  onSetupPaymentsClick,
  onPublish,
  publishing,
  sessions,
  sessionsLoading = false,
  sessionsError = false,
  statsUnavailable = false,
}: CourseOverviewTabProps) {
  const isSeries = course.format === 'series';
  const isFree = course.price <= 0;
  // paymentSetupRequired = the course has a paid tier (price or drop-in) —
  // the same signal gates the publish blocker and the Inntekt KPI.
  const hasPaidTier = paymentSetupRequired;
  // Persisted status is the source of truth — reconcile_course_lifecycle keeps
  // it honest (upcoming/active/completed), so the branches below work off it.
  const status = course.status;

  const ordered = sessions.slice().sort((a, b) => a.session_date.localeCompare(b.session_date));

  // KPI spine for every live/finished state (draft shows the readiness card
  // instead — no signups, no revenue, so the zeros would be dead).
  const stats: [string, string][] = [
    [
      'Påmeldte',
      statsUnavailable
        ? '–'
        : course.capacity > 0
          ? `${enrolledCount} / ${course.capacity}`
          : String(enrolledCount),
    ],
    // Inntekt is omitted on 0 kr courses — no money flow, the zero would be
    // a dead metric. On a participant-fetch failure it reads `–`, not a fake 0.
    ...(hasPaidTier
      ? ([['Inntekt', statsUnavailable ? '–' : formatKroner(revenue)]] as [string, string][])
      : []),
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
          loading={sessionsLoading}
          error={sessionsError}
          progressUnit={isSeries ? 'Uke' : 'Dag'}
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
          onDropInPriceBlur={onDropInPriceBlur}
          acceptsLateSignups={acceptsLateSignups}
          onAcceptsLateSignupsChange={onAcceptsLateSignupsChange}
        />
      )}
    </div>
  );
}

// FramedCard is the shared grouped-content container (see
// components/teacher/FramedCard.tsx) — same setup here and on the
// dashboard home.

// ─── KPI spine (Nøkkeltall) ───────────────────────────────────────────────

function StatRow({ stats }: { stats: [string, string][] }) {
  return (
    <FramedCard title="Nøkkeltall">
      <FramedCardPanel className="flex-row items-stretch">
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
      </FramedCardPanel>
    </FramedCard>
  );
}

// ─── Draft readiness (Publisering) ────────────────────────────────────────
//
// Title, description, location and capacity are all required at creation, so a
// draft only ever needs the one DB-enforced step: Stripe payouts when the
// course has a paid tier. Two states — "set up payouts" (paid course, not
// connected) or "ready to publish".

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
    sub = 'Alt er på plass — publiser for å åpne for påmelding. Kurset blir synlig for alle.';
    label = 'Publiser kurs';
    onClick = onPublish;
    loading = publishing;
  }

  return (
    <FramedCard title="Publisering">
      <FramedCardPanel className="flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
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
      </FramedCardPanel>
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
  loading = false,
  error = false,
  progressUnit,
  onEditSession,
  onOpenAll,
}: {
  sessions: CourseSession[];
  loading?: boolean;
  error?: boolean;
  progressUnit: 'Uke' | 'Dag';
  onEditSession: (id: string) => void;
  onOpenAll: () => void;
}) {
  const today = osloTodayKey();

  // Sessions failed to load — an inline error (not a false "no dates yet"), so
  // the editor state is never mistaken for the authoritative schedule.
  if (error) {
    return (
      <FramedCard title="Timeplan">
        <FramedCardPanel className="items-center justify-center p-5">
          <ErrorState
            variant="inline"
            title="Kunne ikke laste timene."
            message="Last siden på nytt."
          />
        </FramedCardPanel>
      </FramedCard>
    );
  }

  if (loading) {
    return (
      <FramedCard title="Timeplan">
        <FramedCardPanel className="gap-3 p-5">
          <div className="space-y-3" role="status" aria-label="Laster timer">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-36" />
          </div>
        </FramedCardPanel>
      </FramedCard>
    );
  }

  const statusLabel = timeplanHeaderStatus(sessions, today, progressUnit);

  if (sessions.length <= 1) {
    const s = sessions[0];
    // A single date — a centered "when" block (read-only; its time is edited
    // from Rediger). Fills the card next to the Sted map.
    return (
      <FramedCard title="Timeplan" action={statusLabel}>
        <FramedCardPanel className="items-center justify-center p-5 text-center">
          {s ? (
            <>
              <p className="text-base capitalize text-foreground-muted">{weekdayLong(s.session_date)}</p>
              <p className="mt-0.5 text-xl font-medium text-foreground">{dayMonth(s.session_date)}</p>
              <p className="mt-1 text-base tabular-nums text-foreground-muted">{sessionTimeRange(s)}</p>
            </>
          ) : (
            <p className="text-base text-foreground-muted">Ingen dato lagt til ennå</p>
          )}
        </FramedCardPanel>
      </FramedCard>
    );
  }

  // With more than 3 sessions there are always upcoming ones to fill the three
  // preview slots, so show those. With only 2–3, keep finished rows (dimmed +
  // a "Fullført" badge) so the card stays filled instead of going sparse.
  const upcoming = sessions.filter((s) => s.session_date >= today);
  const preview =
    sessions.length > 3 && upcoming.length > 0 ? upcoming.slice(0, 3) : sessions.slice(0, 3);
  // The next one actually being taught — first upcoming, non-cancelled (a
  // future date that's been called off isn't "next"). `sessions` is already
  // sorted ascending, so the first match is the earliest.
  const nextId = sessions.find((s) => s.session_date >= today && s.status !== 'cancelled')?.id;
  return (
    <FramedCard title="Timeplan" action={statusLabel}>
      <FramedCardPanel>
        {/* Dividers only between the session rows — the trailing "Se alle
            timer" is a plain link at the bottom, not a fourth list row. */}
        <div className="divide-y divide-border-subtle">
          {preview.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              today={today}
              isNext={s.id === nextId}
              onEdit={() => onEditSession(s.id)}
            />
          ))}
        </div>
        {sessions.length > preview.length && (
          <button
            type="button"
            onClick={onOpenAll}
            className="mx-4 mb-3.5 mt-1 w-fit rounded text-left text-sm font-medium text-foreground-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Se alle timer
          </button>
        )}
      </FramedCardPanel>
    </FramedCard>
  );
}

function SessionRow({
  session,
  today,
  isNext,
  onEdit,
}: {
  session: CourseSession;
  today: string;
  isNext: boolean;
  onEdit: () => void;
}) {
  const cancelled = session.status === 'cancelled';
  const past = session.session_date < today;
  const editable = !cancelled && !past;
  const label = `${cap(weekdayLong(session.session_date))} ${dayMonth(session.session_date)}`;

  // Date/time. Finished/cancelled rows dim; the "Avlyst" badge
  // (cancelled only) stays full-opacity so it reads clearly.
  const left = (
    <div className={cn('flex min-w-0 flex-1 items-stretch gap-4', !editable && 'opacity-50')}>
      {/* No accent bar — user decision 2026-07-08: plain rows, the "Neste" badge carries emphasis */}
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-base font-medium text-foreground">
          <span>{label}</span>
          {isNext && (
            <Badge variant="neutral" shape="pill" size="sm">
              Neste
            </Badge>
          )}
        </p>
        <p className="mt-0.5 text-sm tabular-nums text-foreground-muted">
          {sessionTimeRange(session)}
        </p>
      </div>
    </div>
  );

  // Sessions are divided rows inside the white inset. Hover never changes
  // the fill — affordance is the cursor, the chevron nudge and the focus ring.
  const layout = 'flex w-full items-stretch gap-4 px-4 py-3';

  // Editable (upcoming) rows are the tap target — chevron nudge, open the
  // reschedule modal.
  if (editable) {
    return (
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Endre ${label}`}
        className={cn(layout, 'group text-left')}
      >
        {left}
        <ChevronRight className="size-5 shrink-0 self-center text-foreground-subtle transition-transform group-hover:translate-x-0.5" />
      </button>
    );
  }

  // Completed (not cancelled) — the header status ("Uke x/x") already says
  // the series is done, so repeating "Fullført" on every row is noise.
  // Same silhouette as an editable row (chevron included), just dimmed.
  if (!cancelled) {
    return (
      <div className={layout}>
        {left}
        <ChevronRight className="size-5 shrink-0 self-center text-foreground-subtle opacity-50" />
      </div>
    );
  }

  // Cancelled is the exception worth flagging per-row, so it keeps its badge.
  return (
    <div className={layout}>
      {left}
      <Badge variant="warning" shape="pill" size="sm" className="shrink-0 self-center">
        Avlyst
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
      <FramedCardPanel>
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
      <div className="relative flex min-h-36 flex-1 items-center justify-center border-t border-border-subtle bg-muted">
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
      </FramedCardPanel>
    </FramedCard>
  );
}

// ─── Kursinnstillinger (series only) ──────────────────────────────────────

function SettingsCard(props: TogglesSectionProps) {
  return (
    <FramedCard title="Kursinnstillinger">
      <TogglesSection {...props} />
    </FramedCard>
  );
}

// ─── Toggles (drop-in + late signups) ─────────────────────────────────────

interface TogglesSectionProps {
  isFree: boolean;
  allowsDropIn: boolean;
  onAllowsDropInChange: (next: boolean) => void;
  dropInPrice: number;
  onDropInPriceChange: (next: number) => void;
  onDropInPriceBlur?: () => void;
  acceptsLateSignups: boolean;
  onAcceptsLateSignupsChange: (next: boolean) => void;
}

function TogglesSection({
  isFree,
  allowsDropIn,
  onAllowsDropInChange,
  dropInPrice,
  onDropInPriceChange,
  onDropInPriceBlur,
  acceptsLateSignups,
  onAcceptsLateSignupsChange,
}: TogglesSectionProps) {
  return (
    <FramedCardPanel className="divide-y divide-border-subtle px-4">
      <DropInToggleRow
        checked={allowsDropIn}
        onChange={onAllowsDropInChange}
        price={dropInPrice}
        onPriceChange={onDropInPriceChange}
        onPriceBlur={onDropInPriceBlur}
      />
      <ToggleRow
        label="Tillat påmelding etter oppstart"
        info={
          isFree
            ? 'Deltakere kan melde seg på selv om kurset er i gang.'
            : 'Deltakere kan melde seg på selv om kurset er i gang. Prisen justeres automatisk etter hvor mange uker som er igjen.'
        }
        checked={acceptsLateSignups}
        onChange={onAcceptsLateSignupsChange}
      />
    </FramedCardPanel>
  );
}

interface ToggleRowProps {
  label: string;
  /** Rendered as an info-icon tooltip beside the label (not a visible sub-line). */
  info?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  children?: React.ReactNode;
}

function ToggleRow({ label, info, checked, onChange, children }: ToggleRowProps) {
  // Rows keep their own vertical padding (no first/last stripping) — the old
  // first:pt-0/last:pb-0 left the content flush against the panel's top and
  // bottom edges while px-4 padded the sides.
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="text-base font-medium text-foreground">{label}</p>
          {info && <InfoTooltip content={info} />}
        </div>
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
  onPriceBlur?: () => void;
}

function DropInToggleRow({ checked, onChange, price, onPriceChange, onPriceBlur }: DropInToggleRowProps) {
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

  // This tab has no save bar — blur is the only commit point. While drop-in
  // is ON, an invalid value (≤0 or cleared) must never commit silently OR
  // outlive the tab as lingering state a later "Lagre" could pick up. Flag it
  // inline and still hand off to the parent, which reverts the state to the
  // committed price (same snap-back grammar as the Plasser clamp — this error
  // line is what explains the snap). When drop-in is OFF, 0/empty is just the
  // unconfigured state — no error to show.
  function handleBlur() {
    setPriceError(checked && price <= 0);
    onPriceBlur?.();
  }

  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="text-base font-medium text-foreground">Tillat drop-in</p>
          <InfoTooltip content="Deltakere kan betale for én enkelt time i stedet for hele kurset." />
        </div>
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
              onBlur={handleBlur}
              aria-invalid={priceError || undefined}
              className="h-8 w-[120px] pr-9 tabular-nums"
            />
            <span className="pointer-events-none absolute right-3 select-none text-sm text-foreground-muted">
              kr
            </span>
          </div>
        </div>
        {priceError && (
          <p className="mt-2 text-sm text-danger animate-in fade-in-0 duration-150">Drop-in krever en pris høyere enn 0 kr.</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={handleToggle} className="mt-1 shrink-0" />
    </div>
  );
}
