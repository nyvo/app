import { Heading, Text } from '@react-email/components'
import * as React from 'react'
import { DetailBlock, DetailRow, EmailLayout, styles } from './_layout.tsx'

export interface OrderConfirmProps {
  buyerName: string
  studioName: string
  courseTitle: string
  courseStart: string
  courseLocation?: string
  amount: string
  bookingId: string
  /** Pre-formatted org number, e.g. "987 654 321". The receipt is the one
   * surface that identifies the legal seller — name + org.nr together. */
  arrangorOrgNumber?: string
  /** Set when the email's replyTo routes to the arrangør. */
  arrangorEmail?: string
}

export const OrderConfirm = ({
  buyerName,
  studioName,
  courseTitle,
  courseStart,
  courseLocation,
  amount,
  bookingId,
  arrangorOrgNumber,
  arrangorEmail,
}: OrderConfirmProps) => (
  <EmailLayout preview={`Påmelding bekreftet — ${courseTitle}`}>
    <Heading as="h1" style={styles.h1}>
      Du er påmeldt
    </Heading>
    <Text style={styles.paragraph}>
      Hei {buyerName}, takk for påmeldingen til {courseTitle} hos {studioName}.
    </Text>

    <DetailBlock>
      <DetailRow label="Kurs" value={courseTitle} />
      <DetailRow label="Tid" value={courseStart} />
      {courseLocation ? <DetailRow label="Sted" value={courseLocation} /> : null}
      <DetailRow
        label="Arrangør"
        value={
          arrangorOrgNumber ? `${studioName} · org.nr ${arrangorOrgNumber}` : studioName
        }
      />
      <DetailRow label="Referanse" value={bookingId} />
      <DetailRow label="Beløp" value={amount} emphasis last />
    </DetailBlock>

    {arrangorEmail ? (
      <Text style={styles.paragraphMuted}>
        Spørsmål om kurset, avlysning eller refusjon? Svar på denne e-posten,
        så når du arrangøren direkte.
      </Text>
    ) : null}
    <Text style={styles.paragraphMuted}>
      Vi sender en påminnelse dagen før kurset starter.
    </Text>
  </EmailLayout>
)

OrderConfirm.PreviewProps = {
  buyerName: 'Marte Hansen',
  studioName: 'Lys Yoga',
  courseTitle: 'Vinyasa Flow — onsdager',
  courseStart: 'onsdag 28. mai kl. 18:00',
  courseLocation: 'Sal 1, Storgata 14, Oslo',
  amount: '1 200 kr',
  bookingId: 'LY-2829',
  arrangorOrgNumber: '987 654 321',
  arrangorEmail: 'hei@lysyoga.no',
} satisfies OrderConfirmProps

export default OrderConfirm
