/**
 * Modals + buttons + toasts — old vs new preview.
 *
 * Static side-by-side rendering of the current dialog/button/toast styles
 * (LEFT) against the proposed redesign (RIGHT). Not interactive — pure
 * markup so you can compare visuals.
 *
 * Route: /dev/modals-buttons-toasts
 */

import { Check, AlertCircle } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn, formatKroner } from '@/lib/utils';

export default function ModalsButtonsToastsPreview() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-12">
        <header className="mb-10">
          <h1 className="text-2xl font-medium tracking-tight">Modals, buttons og toasts</h1>
          <p className="mt-2 text-base text-foreground-muted">
            Forslag til ny stil sammenlignet med dagens. Statisk preview — ingen
            interaksjon. <span className="text-foreground">Gammel</span> til
            venstre, <span className="text-foreground">ny</span> til høyre.
          </p>
        </header>

        {/* ─── 1. MODALS ──────────────────────────────────────────────── */}
        <Section title="Modals">
          <SubSection
            title="1.1 Simple destructive"
            note="Cancel one signup, no money moves. Tier 2 confirm — single-sentence body, no acknowledgement."
          >
            <Compare
              left={<OldConfirm
                headline="Avbestill påmeldingen?"
                scopeName="Joe Smith"
                scopeMeta="joe@example.com"
                actionLabel="Avbestill"
              />}
              right={<NewConfirm
                title="Avbestill påmelding"
                body={<>Påmeldingen for <strong>Joe Smith</strong> avbestilles og plassen frigjøres.</>}
                actionLabel="Avbestill"
              />}
            />
          </SubSection>

          <SubSection
            title="1.2 Money + emails"
            note="Cancel course → refund 12 participants + notify. Tier 2 — checkbox dropped (button is enough)."
          >
            <Compare
              left={<OldConfirm
                headline="Avlys kurset?"
                scopeName="Vinyasa nivå 1"
                scopeMeta="12 deltakere refunderes"
                scopeTrailing={formatKroner(5400)}
                actionLabel="Avlys kurs"
                checkbox="Jeg forstår at 12 deltakere blir refundert og varslet."
              />}
              right={<NewConfirm
                title="Avlys kurs"
                body={
                  <>
                    <strong>Vinyasa nivå 1</strong> avlyses — 12 deltakere refunderes{' '}
                    <strong>{formatKroner(5400)}</strong> og varsles.
                  </>
                }
                actionLabel="Avlys kurs"
              />}
            />
          </SubSection>

          <SubSection
            title="1.3 Catastrophic — type-to-confirm"
            note="Delete account. Tier 3 — the typing requirement IS the friction. No tinted band, no double-gating. Title + 1-line body + input + buttons = 4 elements."
          >
            <Compare
              left={<OldConfirm
                headline="Slett kontoen din?"
                scopeName="kristoffer@example.com"
                scopeMeta="Permanent sletting"
                actionLabel="Slett konto"
                typeToConfirm="SLETT"
              />}
              right={<NewConfirm
                title="Slett konto"
                body={
                  <>
                    Kontoen <strong>kristoffer@example.com</strong> og all tilhørende
                    data slettes permanent.
                  </>
                }
                actionLabel="Slett konto"
                typeToConfirm="SLETT"
              />}
            />
          </SubSection>

          <SubSection
            title="1.4 List scope — keeps the scope card"
            note="Refund preview with N participants. Card stays because it's a real list to scan."
          >
            <Compare
              left={<OldConfirm
                headline="Refunder alle deltakere?"
                scopeList={[
                  { name: 'Joe Smith', meta: 'joe@example.com', trailing: formatKroner(450) },
                  { name: 'Anna Karlsen', meta: 'anna@example.com', trailing: formatKroner(450) },
                  { name: 'Erik Dahl', meta: 'erik@example.com', trailing: formatKroner(450) },
                ]}
                scopeSummary="3 deltakere"
                scopeSummaryTrailing={formatKroner(1350)}
                actionLabel="Refunder alle"
              />}
              right={<NewConfirm
                title="Refunder alle deltakere"
                body={<>3 deltakere refunderes totalt <strong>{formatKroner(1350)}</strong> (5–10 virkedager).</>}
                scopeList={[
                  { name: 'Joe Smith', meta: 'joe@example.com', trailing: formatKroner(450) },
                  { name: 'Anna Karlsen', meta: 'anna@example.com', trailing: formatKroner(450) },
                  { name: 'Erik Dahl', meta: 'erik@example.com', trailing: formatKroner(450) },
                ]}
                actionLabel="Refunder alle"
              />}
            />
          </SubSection>
        </Section>

        {/* ─── 2. BUTTONS ─────────────────────────────────────────────── */}
        <Section title="Buttons — size + variant rework">
          <p className="mb-6 max-w-3xl text-base text-foreground-muted">
            Two changes: (1) keep one default app button size, with larger buttons only for modal footers and public CTAs.
            (2) drop outline buttons — system becomes filled-only. Two variants: filled-dark primary + filled-muted secondary (no border).
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <CompareColumn label="Old usage">
              <ButtonRow label="Modal action (filled secondary cancel)">
                <Button>Avlys kurs</Button>
                <Button variant="secondary">Avbryt</Button>
              </ButtonRow>
              <ButtonRow label="Page header CTA">
                <Button>Opprett kurs</Button>
              </ButtonRow>
              <ButtonRow label="Drawer footer primary">
                <Button>Lagre endringer</Button>
              </ButtonRow>
              <ButtonRow label="Row secondary">
                <Button variant="secondary">Endre</Button>
              </ButtonRow>
            </CompareColumn>

            <CompareColumn label="New usage">
              <ButtonRow label="Modal action (size='lg' + filled muted cancel)">
                <Button
                  size="lg"
                  className="bg-muted text-foreground border-0 shadow-none hover:bg-active"
                >
                  Avbryt
                </Button>
                <Button size="lg">Avlys kurs</Button>
              </ButtonRow>
              <ButtonRow label="Page header CTA (size='default' — 44px)">
                <Button size="default">Opprett kurs</Button>
              </ButtonRow>
              <ButtonRow label="Drawer footer primary (size='default')">
                <Button size="default">Lagre endringer</Button>
              </ButtonRow>
              <ButtonRow label="Row secondary (filled muted, no border)">
                <Button
                  className="bg-muted text-foreground border-0 shadow-none hover:bg-active"
                >
                  Endre
                </Button>
              </ButtonRow>
            </CompareColumn>
          </div>

          <div className="mt-10">
            <h3 className="mb-4 text-lg font-medium tracking-tight">Full scale reference</h3>
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                <SizeChip label="xs · 24px" use="Inline chips, dense filters">
                  <Button>Action</Button>
                </SizeChip>
                <SizeChip label="sm · 32px" use="Table-row actions, toolbars">
                  <Button>Action</Button>
                </SizeChip>
                <SizeChip label="default · 44px" use="Page header CTAs, drawer footers">
                  <Button size="default">Action</Button>
                </SizeChip>
                <SizeChip label="lg · 40px" use="Modal footer actions">
                  <Button size="lg">Action</Button>
                </SizeChip>
                <SizeChip label="cta · 44px" use="Public/marketing primary">
                  <Button size="cta">Action</Button>
                </SizeChip>
              </div>

              <div className="mt-6 border-t border-border-subtle pt-6">
                <ButtonRow label="sm (32px) — inline/dense actions">
                  <Button size="sm">Action</Button>
                  <Button size="sm" variant="secondary">Action</Button>
                  <Button size="sm" variant="outline">Action</Button>
                  <Button size="sm" variant="ghost">Action</Button>
                  <Button size="sm" variant="destructive">Action</Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Handling">
                    <Check className="size-4" />
                  </Button>
                </ButtonRow>
              </div>
            </div>
          </div>
        </Section>

        {/* ─── 3. TOASTS ──────────────────────────────────────────────── */}
        <Section title="Toasts">
          <p className="mb-6 max-w-3xl text-base text-foreground-muted">
            Old uses white surface with a 4px variant stripe (white-on-white reads low-contrast on the calm canvas).
            New uses a dark monochrome surface (foreground / neutral-12) with a small icon for variant — matches Sonner,
            Linear and Vercel defaults. Position stays <code className="rounded bg-muted px-1.5 py-0.5 text-xs">bottom-center</code> (your choice).
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <CompareColumn label="Old toast">
              <div className="space-y-3 rounded-xl bg-muted/40 p-6">
                <OldToast variant="success" message="Kurset er publisert" />
                <OldToast
                  variant="success"
                  message="Påmelding avbestilt"
                  action="Angre"
                />
                <OldToast
                  variant="error"
                  message="Kunne ikke lagre. Prøv igjen."
                />
              </div>
            </CompareColumn>

            <CompareColumn label="New toast">
              <div className="space-y-3 rounded-xl bg-muted/40 p-6">
                {/* Single-line — short confirmation, no extra context */}
                <NewToast variant="success" title="Kurs publisert" />
                {/* Two-line — title + supporting context */}
                <NewToast
                  variant="success"
                  title="Påmelding avbestilt"
                  description="Joe Smith har fått varsel om refusjon."
                  action="Angre"
                />
                {/* Two-line error — title + recovery hint */}
                <NewToast
                  variant="error"
                  title="Kunne ikke lagre"
                  description="Sjekk nettforbindelsen og prøv igjen."
                />
              </div>
            </CompareColumn>
          </div>

          <p className="mt-6 max-w-3xl text-sm text-foreground-muted">
            Note the verb-pairing rule: the button label and the toast message share the same verb root.
            <span className="text-foreground"> "Avlys kurs"</span> →{' '}
            <span className="text-foreground">"Kurs avlyst"</span>. <span className="text-foreground">"Slett deltaker"</span> →{' '}
            <span className="text-foreground">"Deltaker fjernet"</span>.
          </p>
        </Section>
      </div>
    </div>
  );
}

// ─── Layout primitives ────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <h2 className="mb-6 text-xl font-medium tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function SubSection({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-10">
      <div className="mb-4">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-foreground-muted">{note}</p>
      </div>
      {children}
    </div>
  );
}

function Compare({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <CompareColumn label="Old">{left}</CompareColumn>
      <CompareColumn label="New">{right}</CompareColumn>
    </div>
  );
}

function CompareColumn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-foreground-muted">{label}</div>
      {children}
    </div>
  );
}

// ─── Modal renderings (static — not real AlertDialogs) ────────────────

interface ScopeRow {
  name: string;
  meta: string;
  trailing?: string;
}

interface OldConfirmProps {
  headline: string;
  scopeName?: string;
  scopeMeta?: string;
  scopeTrailing?: string;
  scopeList?: ScopeRow[];
  scopeSummary?: string;
  scopeSummaryTrailing?: string;
  actionLabel: string;
  checkbox?: string;
  typeToConfirm?: string;
}

function OldConfirm({
  headline,
  scopeName,
  scopeMeta,
  scopeTrailing,
  scopeList,
  scopeSummary,
  scopeSummaryTrailing,
  actionLabel,
  checkbox,
  typeToConfirm,
}: OldConfirmProps) {
  return (
    <ModalShell width="md">
      <p className="mb-5 text-sm font-semibold leading-snug text-foreground">{headline}</p>

      {scopeName && (
        <ScopeCard>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{scopeName}</p>
              {scopeMeta && (
                <p className="mt-0.5 text-xs text-foreground-muted">{scopeMeta}</p>
              )}
            </div>
            {scopeTrailing && (
              <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                {scopeTrailing}
              </span>
            )}
          </div>
        </ScopeCard>
      )}

      {scopeList && scopeList.length > 0 && (
        <ScopeCard>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{scopeSummary}</span>
              {scopeSummaryTrailing && (
                <span className="text-sm font-medium tabular-nums text-foreground">
                  {scopeSummaryTrailing}
                </span>
              )}
            </div>
            <div className="divide-y divide-border/60 border-t border-border/60 pt-2">
              {scopeList.map((row) => (
                <div key={row.name} className="flex items-center justify-between py-1.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{row.name}</p>
                    <p className="truncate text-xs text-foreground-muted">{row.meta}</p>
                  </div>
                  {row.trailing && (
                    <span className="shrink-0 text-xs tabular-nums text-foreground-muted">
                      {row.trailing}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScopeCard>
      )}

      {typeToConfirm && (
        <label className="mt-4 flex flex-col gap-2 text-xs text-foreground-muted">
          <span>
            Skriv <span className="font-medium text-foreground">{typeToConfirm}</span> for å bekrefte
          </span>
          <Input className="h-8 text-sm" placeholder="" />
        </label>
      )}

      {checkbox && (
        <label className="mt-4 flex items-start gap-2 text-xs text-foreground-muted">
          <Checkbox className="mt-0.5" />
          <span>{checkbox}</span>
        </label>
      )}

      <ModalFooter actionLabel={actionLabel} />
    </ModalShell>
  );
}

interface NewConfirmProps {
  title: string;
  body: React.ReactNode;
  band?: string;
  scopeList?: ScopeRow[];
  actionLabel: string;
  checkbox?: string;
  typeToConfirm?: string;
}

function NewConfirm({
  title,
  body,
  band,
  scopeList,
  actionLabel,
  checkbox,
  typeToConfirm,
}: NewConfirmProps) {
  return (
    <ModalShell width="lg">
      <h3 className="mb-2 text-base font-medium tracking-tight text-foreground">{title}</h3>
      <p className="text-sm text-foreground-muted leading-relaxed">{body}</p>

      {scopeList && scopeList.length > 0 && (
        <ScopeCard className="mt-4">
          <div className="divide-y divide-border/60">
            {scopeList.map((row, i) => (
              <div
                key={row.name}
                className={cn(
                  'flex items-center justify-between py-2',
                  i === 0 && 'pt-0',
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
                  <p className="truncate text-xs text-foreground-muted">{row.meta}</p>
                </div>
                {row.trailing && (
                  <span className="shrink-0 text-sm tabular-nums text-foreground">
                    {row.trailing}
                  </span>
                )}
              </div>
            ))}
          </div>
        </ScopeCard>
      )}

      {typeToConfirm && (
        <label className="mt-5 flex flex-col gap-2 text-sm text-foreground-muted">
          <span>
            Skriv <span className="font-medium text-foreground">{typeToConfirm}</span> for å bekrefte
          </span>
          <Input placeholder="" />
        </label>
      )}

      {checkbox && (
        <label className="mt-5 flex items-start gap-2 text-sm text-foreground-muted">
          <Checkbox className="mt-1" />
          <span>{checkbox}</span>
        </label>
      )}

      {/* Tinted band only when there's NO type-to-confirm. Geist's band is
          for Tier 2 destructive confirms; Tier 3 already gates via typing. */}
      {band && !typeToConfirm && (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-danger/20 bg-danger-subtle/40 px-3 py-2">
          <AlertCircle className="size-4 shrink-0 text-danger" aria-hidden="true" />
          <span className="text-sm text-foreground">{band}</span>
        </div>
      )}

      <NewModalFooter actionLabel={actionLabel} />
    </ModalShell>
  );
}

function ModalShell({
  width,
  children,
}: {
  width: 'md' | 'lg';
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface p-6 shadow-md ring-1 ring-foreground/10',
        width === 'md' ? 'max-w-md' : 'max-w-lg',
      )}
    >
      {children}
    </div>
  );
}

// Old footer shape — right-aligned cluster with secondary cancel + filled action.
function ModalFooter({
  actionLabel,
}: {
  actionLabel: string;
}) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button variant="secondary">
        Avbryt
      </Button>
      <Button>{actionLabel}</Button>
    </div>
  );
}

// New footer — full-width split, equal-width, both filled, no borders.
// Filled-muted secondary (no border) on the left, filled-dark/destructive on
// the right. Per Time2Book / Vipps / MobilePay convention; default focus on
// the safe (left) button.
function NewModalFooter({ actionLabel }: { actionLabel: string }) {
  return (
    <div className="mt-6 flex gap-2">
      <Button
        size="lg"
        className="flex-1 bg-muted text-foreground border-0 shadow-none hover:bg-active"
      >
        Avbryt
      </Button>
      <Button size="lg" className="flex-1">
        {actionLabel}
      </Button>
    </div>
  );
}

function ScopeCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border/60 bg-muted/40 p-3',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─── Toast renderings (static visual previews) ────────────────────────

function OldToast({
  variant,
  message,
  action,
}: {
  variant: 'success' | 'error';
  message: string;
  action?: string;
}) {
  const stripeColor =
    variant === 'success' ? 'bg-success' : 'bg-danger';
  return (
    <div
      className="relative flex w-[360px] items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-4px_rgb(0_0_0/0.12)]"
    >
      <span className={cn('h-5 w-1 self-center rounded-full', stripeColor)} aria-hidden="true" />
      <p className="flex-1 text-sm font-medium text-foreground">{message}</p>
      {action && (
        <button className="rounded-full px-3 py-1 text-xs font-medium text-foreground hover:bg-muted">
          {action}
        </button>
      )}
    </div>
  );
}

function NewToast({
  variant,
  title,
  description,
  action,
}: {
  variant: 'success' | 'error';
  title: string;
  description?: string;
  action?: string;
}) {
  // Card-like toast — taller than a slim pill, supports optional 2nd line
  // for context (matches Time2Book / Linear pattern). Surface ~5% lighter
  // than neutral-12 for a softer near-black. Final spec will introduce a real
  // `--toast-surface` token.
  return (
    <div
      className="flex w-[380px] items-start gap-3 rounded-2xl bg-foreground/95 px-5 py-4 shadow-[0_10px_30px_-6px_rgb(0_0_0/0.22)] ring-1 ring-background/10"
    >
      <span
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
          variant === 'success' ? 'bg-background/15 text-background' : 'bg-danger/30 text-background',
        )}
        aria-hidden="true"
      >
        {variant === 'success' ? <Check className="size-3.5" strokeWidth={2.5} /> : <AlertCircle className="size-3.5" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-background">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-background/70">{description}</p>
        )}
      </div>
      {action && (
        <button className="-mr-1 shrink-0 rounded-full px-3 py-1 text-xs font-medium text-background/90 hover:text-background hover:bg-background/10">
          {action}
        </button>
      )}
    </div>
  );
}

// ─── Buttons preview helpers ──────────────────────────────────────────

function ButtonRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-2 text-xs text-foreground-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function SizeChip({
  label,
  use,
  children,
}: {
  label: string;
  use: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex w-full items-center justify-center rounded-lg border border-border-subtle bg-background py-4">
        {children}
      </div>
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-foreground-muted">{use}</p>
      </div>
    </div>
  );
}
