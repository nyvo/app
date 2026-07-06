import { Heading, Text } from '@react-email/components'
import * as React from 'react'
import { DetailBlock, DetailRow, EmailLayout, styles } from './_layout.tsx'

export interface BookingNotificationProps {
  buyerName: string
  courseTitle: string
  courseStart: string
  /** Pre-formatted via formatKroner, e.g. "1 200 kr" — or "Gratis" for free signups */
  amount: string
  bookingId: string
  buyerEmail?: string
}

export const BookingNotification = ({
  buyerName,
  courseTitle,
  courseStart,
  amount,
  bookingId,
  buyerEmail,
}: BookingNotificationProps) => (
  <EmailLayout preview={`Ny påmelding — ${courseTitle}`}>
    <Heading as="h1" style={styles.h1}>
      Ny påmelding
    </Heading>
    <Text style={styles.paragraph}>
      {buyerName} har meldt seg på {courseTitle}.
    </Text>

    <DetailBlock>
      <DetailRow label="Deltaker" value={buyerName} />
      {buyerEmail ? <DetailRow label="E-post" value={buyerEmail} /> : null}
      <DetailRow label="Kurs" value={courseTitle} />
      <DetailRow label="Tid" value={courseStart} />
      <DetailRow label="Referanse" value={bookingId} />
      <DetailRow label="Beløp" value={amount} emphasis last />
    </DetailBlock>

    <Text style={styles.paragraphMuted}>
      Du finner deltakerlisten under kurset på Openspot.
    </Text>
  </EmailLayout>
)

BookingNotification.PreviewProps = {
  buyerName: 'Marte Hansen',
  courseTitle: 'Vinyasa Flow — onsdager',
  courseStart: 'onsdag 28. mai kl. 18:00',
  amount: '1 200 kr',
  bookingId: 'LY-2829',
  buyerEmail: 'marte@example.no',
} satisfies BookingNotificationProps

export default BookingNotification
