import { ExternalLink } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { PageShell } from '@/components/teacher/PageShell'
import { ErrorState } from '@/components/ui/error-state'
import { BillingPlanSections, subscriptionStatusLine } from '@/pages/teacher/BillingPage'
import { DevPage, PreviewSection } from './_kit'

/**
 * Dev preview for the Abonnement page states. Renders the real PageShell +
 * BillingPlanSections (not a mock), so the page header pattern — title with an
 * inline "Administrer abonnement" action and the subscription status as the
 * description — can be reviewed alongside the plan cards without a logged-in
 * seller. Also covers the hydrate-failed error state (ErrorState), mirroring
 * what BillingPage shows in place of the plan cards.
 */
export default function BillingPreview() {
  const noop = () => {}

  return (
    <DevPage
      title="Abonnement"
      description="PageShell + BillingPlanSections i alle abonnementstilstander, statuslinjens varianter og feiltilstanden ved mislykket kontohenting."
    >
      <PreviewSection label="Start (gratis) — med Månedlig/Årlig">
        <BillingPagePreview
          plan={null}
          status={null}
          renewsAt={null}
          cancel={false}
          onUpgrade={noop}
          yearly={{ price: '4 990 kr' }}
        />
      </PreviewSection>

      <PreviewSection label="Pro – aktiv">
        <BillingPagePreview
          plan="pro"
          status="active"
          renewsAt="10. juli 2026"
          cancel={false}
          onUpgrade={noop}
        />
      </PreviewSection>

      <PreviewSection label="Pro – sies opp ved periodeslutt">
        <BillingPagePreview
          plan="pro"
          status="active"
          renewsAt="10. juli 2026"
          cancel
          onUpgrade={noop}
        />
      </PreviewSection>

      <PreviewSection label="Pro – betaling feilet">
        <BillingPagePreview
          plan="pro"
          status="past_due"
          renewsAt={null}
          cancel={false}
          onUpgrade={noop}
        />
      </PreviewSection>

      <PreviewSection
        label="Retur fra checkout — venter på aktivering"
        description="?stripe=success før webhooken har flippet free→pro: interimlinje som beskrivelse, Pro-CTA deaktivert som «Aktiveres»."
      >
        <BillingPagePreview
          plan={null}
          status={null}
          renewsAt={null}
          cancel={false}
          onUpgrade={noop}
          yearly={{ price: '4 990 kr' }}
          awaitingActivation
        />
      </PreviewSection>

      <PreviewSection
        label="Retur fra checkout — aktivering forsinket"
        description="Aktiverings-pollen utløp (60 s) uten at Pro landet: info-varsel i stedet for stille tilbakefall til gratisvisningen."
      >
        <BillingPagePreview
          plan={null}
          status={null}
          renewsAt={null}
          cancel={false}
          onUpgrade={noop}
          yearly={{ price: '4 990 kr' }}
          activationDelayed
        />
      </PreviewSection>

      <PreviewSection label="Statuslinje — alle varianter (kontrollsjekk)">
        <div className="divide-y divide-border-subtle rounded-xl border border-border bg-surface px-5">
          {STATUS_VARIANTS.map((v) => (
            <div key={v.label} className="flex flex-col gap-0.5 py-3">
              <span className="text-xs font-medium text-foreground">{v.label}</span>
              <span className="text-sm text-foreground-muted">
                {subscriptionStatusLine(v.status, v.renewsAt, v.cancel)}
              </span>
            </div>
          ))}
        </div>
      </PreviewSection>

      <PreviewSection
        label="Feil"
        description="currentSellerHydrateFailed — samme ErrorState som BillingPage viser i stedet for planoversikten når kontoinformasjonen ikke kan hentes."
      >
        <ErrorState
          title="Kunne ikke hente kontoinformasjon"
          message=""
          onRetry={noop}
        />
      </PreviewSection>
    </DevPage>
  )
}

/**
 * Mirrors the real BillingPage composition: the subscription status renders as
 * the PageShell description and "Administrer abonnement" as the inline action
 * for Pro; free sellers get the plain header + plan cards.
 */
function BillingPagePreview({
  plan,
  status,
  renewsAt,
  cancel,
  onUpgrade,
  yearly,
  awaitingActivation,
  activationDelayed,
}: {
  plan: string | null
  status: string | null
  renewsAt: string | null
  cancel: boolean
  onUpgrade: () => void
  yearly?: { price: string }
  awaitingActivation?: boolean
  activationDelayed?: boolean
}) {
  const isPro = plan === 'pro'
  const isPastDue = isPro && status === 'past_due'
  const statusLine = subscriptionStatusLine(status, renewsAt, cancel)

  return (
    <PageShell
      narrow="centered"
      className="px-0 pb-0 pt-0 sm:px-0 lg:px-0 lg:pt-0 md:pb-0"
      title="Abonnement"
      description={
        isPro && !isPastDue
          ? statusLine
          : awaitingActivation
            ? 'Betalingen er mottatt. Abonnementet aktiveres om et øyeblikk.'
            : undefined
      }
      action={
        isPro && !isPastDue ? (
          <Button type="button" variant="secondary" onClick={() => {}}>
            Administrer abonnement
            <ExternalLink className="size-4" aria-hidden />
          </Button>
        ) : undefined
      }
    >
      <BillingPlanSections
        plan={plan}
        status={status}
        onUpgrade={onUpgrade}
        onManage={() => {}}
        checkoutLoading={false}
        portalLoading={false}
        yearly={yearly}
        awaitingActivation={awaitingActivation}
        activationDelayed={activationDelayed}
      />
    </PageShell>
  )
}

const STATUS_VARIANTS: {
  label: string
  status: string | null
  renewsAt: string | null
  cancel: boolean
}[] = [
  { label: 'Aktiv — fornyes automatisk', status: 'active', renewsAt: '10. juli 2026', cancel: false },
  { label: 'Sies opp ved periodeslutt', status: 'active', renewsAt: '10. juli 2026', cancel: true },
  { label: 'Aktiv uten fornyelsesdato', status: 'active', renewsAt: null, cancel: false },
  { label: 'Sies opp — uten dato', status: 'active', renewsAt: null, cancel: true },
  { label: 'Ingen aktiv betaling', status: null, renewsAt: null, cancel: false },
]
