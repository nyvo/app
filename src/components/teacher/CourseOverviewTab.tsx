import { Fragment, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { MapEmbed } from '@/components/ui/map-embed';
import { FramedCard, FramedCardPanel } from '@/components/teacher/FramedCard';
import { TimelineEntry } from '@/components/teacher/TimelineEntry';
import { cn, formatKroner } from '@/lib/utils';
import { osloTodayKey } from '@/utils/dateUtils';
import { MapPin, Pencil } from '@/lib/icons';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { WEEKDAYS_LONG, MONTHS_LONG, MONTHS_SHORT } from '@/lib/calendar-nb';
import type { MappedCourse } from '@/hooks/use-course-detail';
import type { CourseSession } from '@/types/database';

interface CourseOverviewTabProps {
  course: MappedCourse;
  /** Confirmed signups on the course — drives the "Påmeldte" KPI (matches the
   *  Påmeldte tab count). */
  enrolledCount: number;
  /** Net paid revenue (amount_paid minus buyer service fee and platform take) — "Inntekt" KPI. */
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
   *  per-card pencil). */
  onEditSession: (sessionId: string) => void;
  /** Routes to /settings/payouts. Used by the payout readiness nudge. */
  onSetupPaymentsClick: () => void;
  /** Publishes the course — fired by the draft readiness card's CTA. */
  onPublish: () => void;
  /** Publish request in flight — drives the CTA button's loading state. */
  publishing: boolean;
  /** All session rows (date + time per occurrence). Drives the Kursplan feed
   *  for every format: single one-day, multi-day single, and weekly series. */
  sessions: CourseSession[];
  /** Sessions query still loading — the Kursplan feed shows skeletons. */
  sessionsLoading?: boolean;
  /** Sessions query failed — the Kursplan feed shows an inline error, never a
   *  false "no dates yet". */
  sessionsError?: boolean;
  /** Participant-derived stats (Påmeldte/Inntekt) couldn't load — render `–`
   *  instead of a fabricated 0. */
  statsUnavailable?: boolean;
}

const WAITING_STATUSES = new Set(['pending', 'restricted']);

/** Feed cap — matched to the right column's height (Sted tile + settings).
 *  At the cap, the overflow collapses into the "x timer til" tail entry. */
const MAX_VISIBLE_SESSIONS = 4;

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

/** Compact feed-rail form: "14. jul". */
function dayMonthShort(date: string): string {
  const d = localDate(date);
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
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
  const showToggles =
    isSeries && (status === 'draft' || status === 'upcoming' || status === 'active');

  return (
    <div className="space-y-6">
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

      {/* Kursplan feed left, Sted (+ series settings) right. Both columns open
          with the same section-heading row, so the map tile's top edge aligns
          with the first session card in every scenario. */}
      <div className="grid items-start gap-6 lg:grid-cols-[1.55fr_1fr]">
        <KursplanSection
          course={course}
          sessions={ordered}
          loading={sessionsLoading}
          error={sessionsError}
          onEditSession={onEditSession}
          onOpenAll={onOpenKursplan}
        />
        <div className="grid gap-6">
          <StedSection course={course} />
          {showToggles && (
            <SettingsSection
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
      </div>
    </div>
  );
}

/** Shared section heading — one style opens every zone in both columns. */
function SectionHeading({ children }: { children: string }) {
  return <h2 className="mb-3 text-sm font-semibold text-foreground">{children}</h2>;
}

// ─── KPI spine (Nøkkeltall) ───────────────────────────────────────────────

function StatRow({ stats }: { stats: [string, string][] }) {
  return (
    <FramedCard title="Nøkkeltall">
      <FramedCardPanel className="flex-row items-stretch">
        {stats.map(([label, value], i) => (
          <Fragment key={label}>
            {/* Short inset divider — subtle, not a full-height border. */}
            {i > 0 && <div className="my-auto h-12 w-px shrink-0 bg-border-subtle" />}
            <div className="flex-1 px-3 py-4 text-center sm:px-5 sm:py-5">
              <p className="text-sm text-foreground-muted">{label}</p>
              <p className="mt-1.5 text-xl font-medium whitespace-nowrap tabular-nums text-foreground sm:text-2xl">{value}</p>
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
      sub = 'Koble til Stripe for å ta imot betaling.';
      label = 'Sett opp utbetaling';
    }
    onClick = onSetupPaymentsClick;
  } else {
    heading = 'Klar til å publisere';
    sub = 'Publiser for å åpne for påmelding.';
    label = 'Publiser kurs';
    onClick = onPublish;
    loading = publishing;
  }

  return (
    <FramedCard title="Publisering">
      <FramedCardPanel className="flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md">
          <p className="text-base font-medium text-foreground">{heading}</p>
          <p className="mt-1 text-sm text-foreground-muted">{sub}</p>
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

// ─── Kursplan — the session feed ──────────────────────────────────────────
//
// Upcoming sessions hang on a date rail as grey cards (Luma-style feed,
// re-skinned): date + weekday on the canvas left, dot + hairline rail, then a
// two-line card — identity as the title (Uke x/n for series, Dag x/n for
// multi-day, the course name for one-day), time range as metadata. History is
// never shown here (the "Se alle timer" modal owns the full list), and beyond
// MAX_VISIBLE_SESSIONS the remainder collapses into a tail entry that closes
// the rail with its own dot. A single entry drops the rail entirely but keeps
// the same three-column grid, so cards start at the same x in every format.

function KursplanSection({
  course,
  sessions,
  loading,
  error,
  onEditSession,
  onOpenAll,
}: {
  course: MappedCourse;
  sessions: CourseSession[];
  loading: boolean;
  error: boolean;
  onEditSession: (id: string) => void;
  onOpenAll: () => void;
}) {
  const today = osloTodayKey();

  let body: React.ReactNode;

  if (error) {
    // Sessions failed to load — an inline error (not a false "no dates yet"),
    // so the editor state is never mistaken for the authoritative schedule.
    body = (
      <div className="rounded-xl bg-muted p-5">
        <ErrorState variant="inline" title="Kunne ikke laste timene." message="Last siden på nytt." />
      </div>
    );
  } else if (loading) {
    body = (
      <div className="space-y-3" role="status" aria-label="Laster timer">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  } else if (sessions.length === 0) {
    body = (
      <div className="rounded-xl bg-muted px-4 py-3">
        <p className="text-base text-foreground">Ingen dato lagt til ennå</p>
      </div>
    );
  } else {
    body = (
      <SessionFeed
        course={course}
        sessions={sessions}
        today={today}
        onEditSession={onEditSession}
        onOpenAll={onOpenAll}
      />
    );
  }

  return (
    <section>
      <SectionHeading>Kursplan</SectionHeading>
      {body}
    </section>
  );
}

function SessionFeed({
  course,
  sessions,
  today,
  onEditSession,
  onOpenAll,
}: {
  course: MappedCourse;
  sessions: CourseSession[];
  today: string;
  onEditSession: (id: string) => void;
  onOpenAll: () => void;
}) {
  const isSeries = course.format === 'series';
  const total = sessions.length;
  const upcoming = sessions.filter((s) => s.session_date >= today);

  // Everything is in the past (finished/cancelled course) — one honest line,
  // the modal keeps the history.
  if (upcoming.length === 0) {
    return (
      <div className="flex flex-col items-start gap-1.5 py-1">
        <p className="text-sm text-foreground-muted">Ingen kommende timer</p>
        <SeeAllLink onClick={onOpenAll}>Se fullførte timer</SeeAllLink>
      </div>
    );
  }

  const overflow = upcoming.length > MAX_VISIBLE_SESSIONS;
  const visible = overflow ? upcoming.slice(0, MAX_VISIBLE_SESSIONS - 1) : upcoming;
  const remaining = upcoming.length - visible.length;
  const lastDate = upcoming[upcoming.length - 1].session_date;
  // The next session actually being taught — first upcoming, non-cancelled.
  const nextId = upcoming.find((s) => s.status !== 'cancelled')?.id;
  const entryCount = visible.length + (overflow ? 1 : 0);
  // A lone entry needs no timeline — the rail only earns its place between
  // entries. The grid columns stay, so the card's x-position never moves.
  const showRail = entryCount > 1;

  /** Card title = the session's identity within its format. */
  function labelFor(session: CourseSession): string {
    if (total === 1) return course.title;
    const index = sessions.indexOf(session) + 1;
    return isSeries ? `Uke ${index}/${total}` : `Dag ${index}/${total}`;
  }

  return (
    <div>
      {visible.map((s, i) => {
        const cancelled = s.status === 'cancelled';
        const label = labelFor(s);
        return (
          <TimelineEntry
            key={s.id}
            date={<FeedDateLabel date={s.session_date} />}
            rail={showRail}
            next={s.id === nextId}
            lineAbove={i > 0}
            lineBelow={i < entryCount - 1}
            isLast={i === entryCount - 1}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={onOpenAll}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenAll();
                }
              }}
              aria-label={`Se alle timer – ${label}`}
              className="cursor-pointer rounded-xl bg-muted px-4 py-3 outline-none transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-center gap-2.5">
                <p
                  className={cn(
                    'min-w-0 truncate text-base font-medium tabular-nums',
                    cancelled ? 'text-foreground-muted line-through' : 'text-foreground',
                  )}
                >
                  {label}
                </p>
                <span className="min-w-0 flex-1" />
                {/* The right slot is always the row's status/action: the edit
                    button normally, the Avlyst pill when cancelled. */}
                {cancelled ? (
                  <Badge variant="warning" shape="pill" size="sm" className="shrink-0">
                    Avlyst
                  </Badge>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      // The whole card opens the modal — the pencil targets
                      // reschedule for this session, so it must not bubble.
                      e.stopPropagation();
                      onEditSession(s.id);
                    }}
                    aria-label={`Endre ${label}, ${dayMonth(s.session_date)}`}
                    className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-surface text-foreground-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
              <p
                className={cn(
                  'mt-0.5 text-sm tabular-nums',
                  cancelled ? 'text-foreground-muted' : 'text-foreground',
                )}
              >
                {sessionTimeRange(s)}
              </p>
            </div>
          </TimelineEntry>
        );
      })}

      {overflow && (
        <TimelineEntry rail lineAbove lineBelow={false} isLast>
          <div className="flex items-center gap-3 pt-3 text-sm tabular-nums text-foreground-muted">
            <span>
              {remaining === 1 ? '1 time til' : `${remaining} timer til`}, frem til{' '}
              {dayMonth(lastDate)}
            </span>
            <SeeAllLink onClick={onOpenAll} />
          </div>
        </TimelineEntry>
      )}
    </div>
  );
}

/** Date-column lines for a feed row: "14. jul" over the weekday. */
function FeedDateLabel({ date }: { date: string }) {
  return (
    <>
      <p className="text-sm font-medium tabular-nums text-foreground">{dayMonthShort(date)}</p>
      <p className="mt-0.5 text-sm leading-tight text-foreground-muted">{weekdayLong(date)}</p>
    </>
  );
}

function SeeAllLink({
  onClick,
  children = 'Se alle timer',
}: {
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

// ─── Sted — map tile with the place pill ──────────────────────────────────

function StedSection({ course }: { course: MappedCourse }) {
  const hasCoords =
    !!course.locationPlaceId ||
    (course.locationLat != null && course.locationLon != null);

  return (
    <section>
      <SectionHeading>Sted</SectionHeading>
      {/* White tile surface: the defensive no-coords branch — unreachable in
          product, creation requires a placeId — would otherwise sit
          muted-on-muted under the muted pill. On the loaded map the pill
          reads against imagery. */}
      <div className="relative h-[222px] overflow-hidden rounded-xl border border-border-subtle bg-surface">
        {hasCoords ? (
          <MapEmbed
            placeId={course.locationPlaceId}
            lat={course.locationLat}
            lon={course.locationLon}
            className="absolute inset-0 h-full w-full rounded-none border-0 bg-transparent"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <MapPin className="size-7 text-foreground-subtle" aria-hidden="true" />
          </div>
        )}
        {/* The pill is the tile's only label — the full address lives in
            Rediger. Non-interactive so the map stays clickable underneath. */}
        {/* Top-right: Google's place-embed draws its own info card top-left,
            so that corner is taken on the loaded map. White fill + hairline —
            the muted fill is invisible over pale map imagery; an overlay chip
            needs an opaque surface and an edge to read. */}
        <Badge
          variant="neutral"
          shape="pill"
          size="md"
          // max-w caps the pill so a long address truncates instead of
          // overflowing the tile; truncate adds text-overflow (the base
          // badge already has overflow-hidden + whitespace-nowrap).
          className="pointer-events-none absolute right-3 top-3 z-10 max-w-[calc(100%-1.5rem)] truncate border-border-subtle bg-surface"
        >
          {course.location || 'Ikke lagt til ennå'}
        </Badge>
      </div>
    </section>
  );
}

// ─── Kursinnstillinger (series only) ──────────────────────────────────────

interface SettingsSectionProps {
  isFree: boolean;
  allowsDropIn: boolean;
  onAllowsDropInChange: (next: boolean) => void;
  dropInPrice: number;
  onDropInPriceChange: (next: number) => void;
  onDropInPriceBlur?: () => void;
  acceptsLateSignups: boolean;
  onAcceptsLateSignupsChange: (next: boolean) => void;
}

function SettingsSection({
  isFree,
  allowsDropIn,
  onAllowsDropInChange,
  dropInPrice,
  onDropInPriceChange,
  onDropInPriceBlur,
  acceptsLateSignups,
  onAcceptsLateSignupsChange,
}: SettingsSectionProps) {
  return (
    <section>
      <SectionHeading>Kursinnstillinger</SectionHeading>
      {/* Outlined, not filled — mirrors the Sted tile's hairline edge so the
          right column reads as one family; the grey fill stays on the feed. */}
      <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface px-4">
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
      </div>
    </section>
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
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium text-foreground">{label}</p>
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
          <p className="text-sm font-medium text-foreground">Tillat drop-in</p>
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
              className="h-8 w-[120px] pr-9 text-sm tabular-nums"
            />
            <span className="pointer-events-none absolute right-3 select-none text-sm text-foreground-muted">
              kr
            </span>
          </div>
        </div>
        {priceError && (
          <p className="mt-2 text-sm text-danger animate-in fade-in-0 duration-150">Drop-in krever en pris over 0 kr.</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={handleToggle} className="mt-1 shrink-0" />
    </div>
  );
}
