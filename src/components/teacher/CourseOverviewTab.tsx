import { useRef, useState } from 'react';
import { Clock } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { SettingsSection } from '@/components/teacher/SettingsSection';
import { cn, formatKroner } from '@/lib/utils';
import type { MappedCourse } from '@/hooks/use-course-detail';
import {
  PublishChecklist,
  type ChecklistItemKey,
} from '@/components/teacher/PublishChecklist';

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
   *  Free-tier sellers publish without Stripe onboarding — the checklist row
   *  and the waiting-for-approval banner are hidden for them. */
  paymentSetupRequired: boolean;
  allowsDropIn: boolean;
  onAllowsDropInChange: (next: boolean) => void;
  dropInPrice: number;
  onDropInPriceChange: (next: number) => void;
  acceptsLateSignups: boolean;
  onAcceptsLateSignupsChange: (next: boolean) => void;
  /** Opens the Kursplan modal — used by Kommende/Pågår and Ferdig. */
  onOpenKursplan: () => void;
  /** Routes to /innstillinger/utbetaling. Used by the payment checklist row. */
  onSetupPaymentsClick: () => void;
  /** Caller decides what each checklist row navigates to (image/description/
   *  location → Rediger tab; payments → onSetupPaymentsClick). */
  onJumpToField: (key: ChecklistItemKey) => void;
  /** Total session rows on the course — drives whether the "Se kursplan"
   *  button shows (multi-session: a series, or a multi-day single). */
  sessionCount: number;
}

const WAITING_STATUSES = new Set(['pending', 'restricted']);

function formatNorwegianDate(input: string | null | undefined): string {
  if (!input) return '';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
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
  onSetupPaymentsClick,
  onJumpToField,
  sessionCount,
}: CourseOverviewTabProps) {
  const isSeries = course.format === 'series';
  const isFree = course.price <= 0;
  // Persisted status is the source of truth — reconcile_course_lifecycle keeps
  // it honest (upcoming/active/completed), so the lifecycle branches below
  // (incl. the `completed` end-state) work directly off it.
  const status = course.status;

  const isWaitingForPaymentSetup =
    paymentSetupRequired &&
    status === 'draft' &&
    !paymentSetupComplete &&
    paymentSetupStatus !== null &&
    WAITING_STATUSES.has(paymentSetupStatus);

  // Drop-in and late-signups are both series-only concepts (the RPC ignores
  // them for single courses), so the whole section is hidden on enkelttime.
  const showTogglesCard =
    isSeries && (status === 'draft' || status === 'upcoming' || status === 'active');
  const showKursplanCard = isSeries && (status === 'upcoming' || status === 'active');
  // Enkeltkurs only earns a card when it spans multiple days — then it mirrors
  // the Kursrekke card (compact summary + "Se kursplan"), without per-session
  // metadata. A single-day enkeltkurs renders nothing here.
  const showSingleSessionCard =
    !isSeries && sessionCount > 1 && (status === 'upcoming' || status === 'active');

  return (
    <div className="space-y-8">
      {/* KPI spine — always rendered so the Oversikt is never empty, in every
          lifecycle state (draft, upcoming, active, completed, cancelled) and
          for both series and enkelttime. */}
      <CourseKpis
        enrolled={enrolledCount}
        capacity={course.capacity}
        revenue={revenue}
        price={course.price}
      />

      {isWaitingForPaymentSetup && (
        <InfoBanner
          title="Venter på godkjenning fra Stripe."
          sub="Vi varsler deg på e-post når den er godkjent. Det tar vanligvis 1–2 virkedager."
          action={{ label: 'Se status', onClick: onSetupPaymentsClick }}
        />
      )}

      {status === 'draft' && (
        <PublishChecklist
          items={[
            {
              key: 'image',
              title: 'Legg til et bilde',
              description: 'Anbefalt, men ikke påkrevd for publisering.',
              done: !!course.imageUrl,
              required: false,
            },
            {
              key: 'description',
              title: 'Skriv en kort beskrivelse',
              description: 'Hva får deltakerne ut av kurset?',
              done: !!course.description,
            },
            {
              key: 'location',
              title: 'Velg sted',
              description: 'Adressen vises på kurssiden og i bekreftelsen.',
              done: !!course.location,
            },
            ...(paymentSetupRequired
              ? [{
                  key: 'payments' as const,
                  title: 'Sett opp utbetaling',
                  description: 'Påkrevd for å ta imot påmeldinger.',
                  done: paymentSetupComplete,
                }]
              : []),
          ]}
          onItemClick={onJumpToField}
        />
      )}

      {status === 'completed' && (
        <EndStateSection
          title={
            course.endDate
              ? `Siste time var ${formatNorwegianDate(course.endDate)}`
              : 'Kurset er ferdig'
          }
          sub={`${course.enrolled} deltakere fullførte kursrekken.`}
          action={isSeries ? { label: 'Se kursplan', onClick: onOpenKursplan } : undefined}
        />
      )}

      {status === 'cancelled' && (
        <EndStateSection
          title="Kurset er avlyst"
          sub="Påmeldte er varslet og refundert."
        />
      )}

      {showKursplanCard && (
        // Series schedule — just the session count + a way into the full plan.
        // Too little for a labelled section, so it's a compact card row.
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <p className="text-base font-medium text-foreground">
              Kursrekke · {course.totalWeeks} {course.totalWeeks === 1 ? 'uke' : 'uker'}
            </p>
            {sessionCount > 1 && (
              <Button variant="default" onClick={onOpenKursplan} className="shrink-0">
                Se kursplan
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {showSingleSessionCard && (
        // Multi-day enkeltkurs — mirrors the Kursrekke card: a compact summary
        // row + a way into the full plan, no per-session metadata.
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <p className="text-base font-medium text-foreground">
              Enkeltkurs · {sessionCount} {sessionCount === 1 ? 'dag' : 'dager'}
            </p>
            <Button variant="default" onClick={onOpenKursplan} className="shrink-0">
              Se kursplan
            </Button>
          </CardContent>
        </Card>
      )}

      {showTogglesCard && (
        <SettingsSection title="Kursinnstillinger">
          <Card>
            <CardContent>
              <TogglesSection
                isFree={isFree}
                allowsDropIn={allowsDropIn}
                onAllowsDropInChange={onAllowsDropInChange}
                dropInPrice={dropInPrice}
                onDropInPriceChange={onDropInPriceChange}
                acceptsLateSignups={acceptsLateSignups}
                onAcceptsLateSignupsChange={onAcceptsLateSignupsChange}
              />
            </CardContent>
          </Card>
        </SettingsSection>
      )}
    </div>
  );
}

// ─── KPI spine ─────────────────────────────────────────────────────────

function CourseKpis({
  enrolled,
  capacity,
  revenue,
  price,
}: {
  enrolled: number;
  capacity: number;
  revenue: number;
  price: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <KpiCard
        label="Påmeldte"
        value={capacity > 0 ? `${enrolled} / ${capacity}` : String(enrolled)}
      />
      <KpiCard label="Inntekt" value={formatKroner(revenue)} />
      <KpiCard label="Pris" value={price > 0 ? formatKroner(price) : 'Gratis'} />
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4">
      <p className="text-xs font-medium text-foreground-muted">{label}</p>
      <p className="mt-2 text-2xl font-medium tracking-tight text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}

// ─── Banner ────────────────────────────────────────────────────────────

interface BannerProps {
  title: string;
  sub: string;
  action?: { label: string; onClick: () => void };
}

function InfoBanner({ title, sub, action }: BannerProps) {
  return (
    <BaseBanner
      title={title}
      sub={sub}
      action={action}
      tone="info"
      icon={<Clock className="size-5" />}
    />
  );
}

function BaseBanner({
  title,
  sub,
  action,
  tone,
  icon,
}: BannerProps & { tone: 'warning' | 'info'; icon: React.ReactNode }) {
  const toneClasses =
    tone === 'warning'
      ? 'bg-warning-subtle border-warning/20 text-warning'
      : 'bg-info-subtle border-info/20 text-info';
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-md border px-4 py-3.5',
        toneClasses,
      )}
    >
      <div className={cn('shrink-0', tone === 'warning' ? 'text-warning' : 'text-info')}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-foreground">
        <p className="text-base font-medium text-foreground">{title}</p>
        <p className="text-base text-foreground-muted mt-0.5">{sub}</p>
      </div>
      {action && (
        <Button variant="default" onClick={action.onClick} className="shrink-0">
          {action.label}
        </Button>
      )}
    </div>
  );
}

function EndStateSection({
  title,
  sub,
  action,
}: {
  title: string;
  sub: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <section className="py-5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base font-medium text-foreground">{title}</p>
          <p className="text-base text-foreground-muted mt-0.5">{sub}</p>
        </div>
        {action && (
          <Button variant="default" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </section>
  );
}

// ─── Toggles (drop-in + late signups, inside a SettingsSection card) ──────

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

// ─── Toggle row (label + switch, optional help, optional price input) ─

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
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-foreground">{label}</p>
        {help && (
          <p className="text-base text-foreground-muted mt-1">{help}</p>
        )}
        {children}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-1 shrink-0" />
    </div>
  );
}

// ─── Drop-in toggle row (owns price + activation validation) ──────────

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
      <div className="flex-1 min-w-0">
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
            <span className="pointer-events-none absolute right-3 text-sm text-foreground-muted select-none">
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
