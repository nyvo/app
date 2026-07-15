import { Heading, Text } from '@react-email/components'
import * as React from 'react'
import {
  ArrangorContact,
  DetailBlock,
  DetailRow,
  EmailLayout,
  styles,
} from './_layout.tsx'

export interface SignupCancelledProps {
  buyerName: string
  studioName: string
  courseTitle: string
  /** Pre-formatted Norwegian date/time, e.g. "onsdag 28. mai kl. 18:00" */
  courseStart?: string
  /**
   * Optional pre-formatted money line for this participant's situation.
   * Computed by the caller (teacher-cancel-signup) — the template stays
   * dumb about payment state.
   */
  paymentNote?: string
  /** Arrangør address shown as the participant's contact route. */
  arrangorEmail?: string
}

export const SignupCancelled = ({
  buyerName,
  studioName,
  courseTitle,
  courseStart,
  paymentNote,
  arrangorEmail,
}: SignupCancelledProps) => (
  <EmailLayout preview={`Avmeldt: ${courseTitle}`}>
    <Heading as="h1" style={styles.h1}>
      Du er avmeldt
    </Heading>
    <Text style={styles.paragraph}>
      Hei{buyerName ? ` ${buyerName}` : ''}, {studioName} har meldt deg av{' '}
      {courseTitle}.
    </Text>

    {paymentNote ? <Text style={styles.paragraph}>{paymentNote}</Text> : null}

    <DetailBlock>
      <DetailRow label="Kurs" value={courseTitle} last={!courseStart} />
      {courseStart ? <DetailRow label="Start" value={courseStart} last /> : null}
    </DetailBlock>

    {arrangorEmail ? (
      <ArrangorContact
        question="Mener du dette er feil, eller har du spørsmål?"
        studioName={studioName}
        email={arrangorEmail}
      />
    ) : null}
  </EmailLayout>
)

SignupCancelled.PreviewProps = {
  buyerName: 'Marte Hansen',
  studioName: 'Lys Yoga',
  courseTitle: 'Vinyasa Flow — onsdager',
  courseStart: 'onsdag 28. mai kl. 18:00',
  paymentNote: 'Har du betalt direkte til Lys Yoga, ta kontakt med dem om tilbakebetaling.',
  arrangorEmail: 'hei@lysyoga.no',
} satisfies SignupCancelledProps

export default SignupCancelled
