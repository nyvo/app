import { Button, Heading, Text } from '@react-email/components'
import * as React from 'react'
import { EmailLayout, styles } from './_layout.tsx'

/** The three action-needed states — mirrors AccountActionReason in
 *  _shared/notifications.ts and the frontend AccountStatusBanner. */
export type AccountActionReason = 'rejected' | 'restricted' | 'payouts_paused'

export interface AccountActionRequiredProps {
  studioName: string
  reason: AccountActionReason
  /** Absolute link back to /settings/payouts (built by the webhook from SITE_URL). */
  actionUrl: string
}

const copy: Record<
  AccountActionReason,
  { heading: string; body: string; consequence: string; cta: string }
> = {
  rejected: {
    heading: 'Kontoen ble avvist',
    body: 'Stripe har avvist kontoen og kan ikke aktivere betalinger for studioet.',
    consequence: 'Nye påmeldinger er stengt inntil dette er løst. Ta kontakt, så hjelper vi deg videre.',
    cta: 'Se detaljer',
  },
  restricted: {
    heading: 'Betalinger er satt på pause',
    body: 'Stripe trenger mer informasjon før studioet kan ta imot påmeldinger igjen.',
    consequence: 'Inntil verifiseringen er fullført, kan ikke nye deltakere melde seg på og betale.',
    cta: 'Fullfør verifisering',
  },
  payouts_paused: {
    heading: 'Utbetalinger er satt på pause',
    body: 'Kortbetalinger fungerer som normalt, men Stripe trenger mer før pengene kan overføres til deg.',
    consequence: 'Betalinger fra deltakere samles opp trygt, men blir ikke utbetalt før dette er på plass.',
    cta: 'Fullfør oppsettet',
  },
}

const button = {
  // Monochrome ink — buttons/chrome stay ink, not azure (brand direction).
  backgroundColor: '#1f1f1f',
  borderRadius: '999px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 500,
  padding: '12px 22px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '4px 0 8px',
}

export const AccountActionRequired = ({
  studioName,
  reason,
  actionUrl,
}: AccountActionRequiredProps) => {
  const c = copy[reason]
  return (
    <EmailLayout preview={c.heading}>
      <Text style={styles.eyebrow}>{studioName}</Text>
      <Heading as="h1" style={styles.h1}>
        {c.heading}
      </Heading>
      <Text style={styles.paragraph}>{c.body}</Text>
      <Text style={styles.paragraphMuted}>{c.consequence}</Text>
      <Button href={actionUrl} style={button}>
        {c.cta}
      </Button>
    </EmailLayout>
  )
}

AccountActionRequired.PreviewProps = {
  studioName: 'Lys Yoga',
  reason: 'restricted',
  actionUrl: 'https://openspot.no/settings/payouts',
} satisfies AccountActionRequiredProps

export default AccountActionRequired
